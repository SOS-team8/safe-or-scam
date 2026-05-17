"""시나리오 API 라우트"""
import json
import asyncio
import logging
from pathlib import Path
from uuid import uuid4
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends, Request

from app.models.scenario import ScenarioTree
from app.pipeline.tree_builder import ScenarioTreeBuilder
from app.api.deps import require_admin, limiter, acquire_task_slot, release_task_slot, cleanup_task_dict, sanitize_error

logger = logging.getLogger("api.scenario")

router = APIRouter(prefix="/scenarios", tags=["scenarios"])

SEED_SCENARIOS_DIR = Path(__file__).parent.parent.parent / "data" / "seed_scenarios"
SCENARIOS_DIR = Path(__file__).parent.parent.parent / "data" / "scenarios"

# 생성 작업 상태 저장
generation_tasks: dict[str, dict] = {}


class GenerateRequest(BaseModel):
    """시나리오 생성 요청"""
    phishing_type: str = Field(min_length=1, max_length=50)
    difficulty: str = Field(default="medium", pattern=r"^(easy|medium|hard)$")
    seed_info: str | None = Field(default=None, max_length=2000)


def _load_scenario(file_path: Path) -> ScenarioTree:
    """JSON 파일에서 시나리오 로드"""
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return ScenarioTree.model_validate(data)


def _save_scenario(scenario: ScenarioTree):
    """시나리오를 JSON 파일로 저장"""
    SCENARIOS_DIR.mkdir(parents=True, exist_ok=True)
    file_path = SCENARIOS_DIR / f"{scenario.id}.json"
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(scenario.model_dump(mode="json"), f, ensure_ascii=False, indent=2)


def _get_all_scenarios() -> list[ScenarioTree]:
    """모든 시나리오 로드 (시드 + 생성된 시나리오)"""
    scenarios = []

    # 시드 시나리오 로드
    if SEED_SCENARIOS_DIR.exists():
        for file_path in SEED_SCENARIOS_DIR.glob("*.json"):
            try:
                scenarios.append(_load_scenario(file_path))
            except Exception:
                continue

    # 생성된 시나리오 로드
    if SCENARIOS_DIR.exists():
        for file_path in SCENARIOS_DIR.glob("*.json"):
            try:
                scenarios.append(_load_scenario(file_path))
            except Exception:
                continue

    return scenarios


@router.get("")
@limiter.limit("60/minute")
async def list_scenarios(request: Request) -> list[dict]:
    """시나리오 목록 조회"""
    scenarios = _get_all_scenarios()
    return [
        {
            "id": s.id,
            "title": s.title,
            "description": s.description,
            "phishing_type": s.phishing_type,
            "difficulty": s.difficulty,
            "created_at": s.created_at.isoformat(),
        }
        for s in scenarios
    ]


@router.get("/{scenario_id}")
@limiter.limit("60/minute")
async def get_scenario(request: Request, scenario_id: str) -> ScenarioTree:
    """시나리오 상세 조회"""
    scenarios = _get_all_scenarios()
    for scenario in scenarios:
        if scenario.id == scenario_id:
            return scenario
    raise HTTPException(status_code=404, detail="Scenario not found")


async def _run_generation(task_id: str, request: GenerateRequest):
    """백그라운드에서 시나리오 생성 실행"""
    try:
        generation_tasks[task_id]["status"] = "generating"
        logger.info("생성 시작: task=%s, type=%s, difficulty=%s", task_id, request.phishing_type, request.difficulty)

        builder = ScenarioTreeBuilder()
        scenario = await builder.build(
            phishing_type=request.phishing_type,
            difficulty=request.difficulty,
            seed_info=request.seed_info,
        )

        _save_scenario(scenario)

        generation_tasks[task_id]["status"] = "completed"
        generation_tasks[task_id]["scenario_id"] = scenario.id
        logger.info("생성 완료: task=%s, scenario=%s", task_id, scenario.id)

    except Exception as e:
        generation_tasks[task_id]["status"] = "failed"
        generation_tasks[task_id]["error"] = sanitize_error(e)
        logger.error("생성 실패: task=%s, error=%s", task_id, str(e))
    finally:
        release_task_slot(task_id)
        cleanup_task_dict(generation_tasks)


@router.post("/generate", dependencies=[Depends(require_admin)])
@limiter.limit("3/minute")
async def generate_scenario(
    request: Request,
    body: GenerateRequest,
    background_tasks: BackgroundTasks
) -> dict:
    """시나리오 자동 생성 (비동기)"""
    task_id = f"task_{uuid4().hex[:8]}"

    if not acquire_task_slot(task_id):
        raise HTTPException(status_code=429, detail="동시 작업 수 제한 초과. 기존 작업이 완료된 후 다시 시도하세요.")

    generation_tasks[task_id] = {
        "status": "pending",
        "phishing_type": body.phishing_type,
        "difficulty": body.difficulty,
    }

    background_tasks.add_task(_run_generation, task_id, body)

    return {"task_id": task_id, "status": "started"}


@router.get("/{scenario_id}/status")
@limiter.limit("60/minute")
async def get_generation_status(request: Request, scenario_id: str) -> dict:
    """생성 작업 상태 조회 (task_id로 조회)"""
    if scenario_id not in generation_tasks:
        raise HTTPException(status_code=404, detail="Task not found")

    task = generation_tasks[scenario_id]
    return task


@router.post("/{scenario_id}/regenerate-images", dependencies=[Depends(require_admin)])
@limiter.limit("3/minute")
async def regenerate_failed_images(
    request: Request,
    scenario_id: str,
    background_tasks: BackgroundTasks
) -> dict:
    """
    실패한 이미지만 재생성
    
    image_url이 null인 노드만 대상으로 이미지를 다시 생성합니다.
    """
    # 시나리오 로드
    scenario_file = SCENARIOS_DIR / f"{scenario_id}.json"
    if not scenario_file.exists():
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    scenario = _load_scenario(scenario_file)
    
    # 실패한 노드 확인
    failed_nodes = [
        node_id for node_id, node in scenario.nodes.items()
        if node.image_prompt and not node.image_url
    ]
    
    if not failed_nodes:
        return {
            "status": "no_failures",
            "message": "모든 이미지가 이미 생성되어 있습니다.",
            "total_nodes": len(scenario.nodes),
            "failed_count": 0
        }

    task_id = f"regen_{uuid4().hex[:8]}"

    if not acquire_task_slot(task_id):
        raise HTTPException(status_code=429, detail="동시 작업 수 제한 초과. 기존 작업이 완료된 후 다시 시도하세요.")
    generation_tasks[task_id] = {
        "status": "pending",
        "scenario_id": scenario_id,
        "failed_count": len(failed_nodes),
        "failed_nodes": failed_nodes,
    }
    
    background_tasks.add_task(_run_image_regeneration, task_id, scenario_id)
    
    return {
        "task_id": task_id,
        "status": "started",
        "failed_count": len(failed_nodes),
        "failed_nodes": failed_nodes
    }


async def _run_image_regeneration(task_id: str, scenario_id: str):
    """백그라운드에서 실패한 이미지 재생성 (배치 병렬 처리)"""
    from app.core.image_generator import generate_image
    from app.config import settings
    
    try:
        generation_tasks[task_id]["status"] = "regenerating"
        logger.info(f"이미지 재생성 시작: scenario={scenario_id}")
        
        # 시나리오 로드
        scenario_file = SCENARIOS_DIR / f"{scenario_id}.json"
        scenario = _load_scenario(scenario_file)
        
        # 실패한 노드 추출
        failed_nodes = [
            (node_id, node) for node_id, node in scenario.nodes.items()
            if node.image_prompt and not node.image_url
        ]
        
        total = len(failed_nodes)
        success_count = 0
        batch_size = settings.image_batch_size  # 기본 25개
        
        # 배치 병렬 처리
        for i in range(0, total, batch_size):
            batch = failed_nodes[i:i + batch_size]
            batch_num = i // batch_size + 1
            total_batches = (total + batch_size - 1) // batch_size
            
            logger.info(f"재생성 배치 {batch_num}/{total_batches}: {len(batch)}개 처리 중...")
            
            # 배치 내 병렬 생성
            async def generate_single(node_id: str, node):
                url = await generate_image(node.image_prompt, node_id, scenario_id)
                if url:
                    node.image_url = url
                    return True
                return False
            
            tasks = [generate_single(node_id, node) for node_id, node in batch]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            batch_success = sum(1 for r in results if r is True)
            success_count += batch_success
            logger.info(f"배치 {batch_num} 완료: {batch_success}/{len(batch)} 성공")
            
            # 다음 배치 전 대기 (API 할당량 관리)
            if i + batch_size < total:
                await asyncio.sleep(settings.image_batch_wait)
        
        # 시나리오 저장
        _save_scenario(scenario)
        
        generation_tasks[task_id]["status"] = "completed"
        generation_tasks[task_id]["success_count"] = success_count
        generation_tasks[task_id]["total_attempted"] = total
        logger.info(f"이미지 재생성 완료: {success_count}/{total} 성공")
        
    except Exception as e:
        generation_tasks[task_id]["status"] = "failed"
        generation_tasks[task_id]["error"] = sanitize_error(e)
        logger.error(f"이미지 재생성 실패: {e}")
    finally:
        release_task_slot(task_id)
        cleanup_task_dict(generation_tasks)
