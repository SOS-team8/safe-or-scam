"""시나리오 트리 빌더 (메인 오케스트레이터)"""
import asyncio
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from app.config import settings

logger = logging.getLogger("pipeline.tree_builder")

SCENARIOS_DIR = Path(__file__).parent.parent / "data" / "scenarios"
from app.models.scenario import ScenarioTree, ScenarioNode, Choice, Resources
from app.pipeline.node_generator import (
    generate_root_node,
    generate_node,
    result_to_node,
    GenerationContext,
)
from app.pipeline.context_manager import build_story_path
from app.pipeline.end_sequence import compute_end_signal
from app.pipeline.enrichment import enrich_node_with_education
from app.pipeline.validation import validate_structure, ValidationError
from app.pipeline.repair import repair_tree
from app.core.image_generator import generate_image


class ScenarioTreeBuilder:
    """Agentic 시나리오 트리 빌더"""

    def __init__(self):
        self.semaphore = asyncio.Semaphore(settings.semaphore_limit)
        self.node_counter = 0

    def _next_node_id(self) -> str:
        self.node_counter += 1
        return f"node_{self.node_counter:03d}"

    async def build(
        self,
        phishing_type: str,
        difficulty: str = "medium",
        seed_info: str | None = None
    ) -> ScenarioTree:
        """전체 시나리오 트리 생성"""
        self.node_counter = 0
        logger.info("=== Pipeline Start: type=%s, difficulty=%s ===", phishing_type, difficulty)

        try:
            async with asyncio.timeout(settings.pipeline_timeout):
                # Phase 1: Seed (루트 노드 생성)
                root, protagonist_data, prologue = await self._generate_root(phishing_type, difficulty, seed_info)

                # 주인공 프로필 변환
                from app.models.scenario import ProtagonistProfile
                protagonist = None
                if protagonist_data:
                    try:
                        protagonist = ProtagonistProfile.model_validate(protagonist_data)
                        logger.info("주인공 프로필 생성: %s %s", protagonist.age_group, protagonist.gender)
                    except Exception as e:
                        logger.warning("주인공 프로필 변환 실패: %s", e)

                # 프롤로그 로깅
                if prologue:
                    logger.info("프롤로그 생성: %s...", prologue[:50] if len(prologue) > 50 else prologue)

                tree = ScenarioTree(
                    id=f"scenario_{uuid4().hex[:8]}",
                    title=f"{phishing_type} 시나리오",
                    description=f"{phishing_type}을 체험하는 교육 시나리오입니다.",
                    phishing_type=phishing_type,
                    difficulty=difficulty,
                    root_node_id=root.id,
                    nodes={root.id: root},
                    protagonist=protagonist,
                    prologue=prologue,
                    created_at=datetime.now(timezone.utc),
                )
                logger.info("[Phase 1/5] Seed 완료: choices=%d, prologue=%s", len(root.choices), bool(prologue))
                self._save_progress(tree, "phase1_seed")

                # Phase 2: BFS Expand (병렬 확장)
                frontier = [(root, choice) for choice in root.choices]
                level = 0
                while frontier:
                    level += 1
                    logger.info("[Phase 2/5] Level %d: %d개 브랜치 확장 중...", level, len(frontier))
                    frontier = await self._expand_level(tree, phishing_type, difficulty, frontier)
                    logger.info("[Phase 2/5] Level %d 완료: 총 노드=%d", level, len(tree.nodes))
                    self._save_progress(tree, f"phase2_level{level}")

                # Phase 3: Enrich (교육 콘텐츠) - 현재 비활성화, 폴백 교육 콘텐츠만 사용
                logger.info("[Phase 3/5] Enrich 스킵 (폴백 교육 콘텐츠만 사용)")
                self._save_progress(tree, "phase3_enrich_skipped")

                # Phase 4: Image 생성 (주요 노드만)
                logger.info("[Phase 4/5] 이미지 생성 중...")
                await self._generate_images(tree)
                logger.info("[Phase 4/5] Image 완료")
                self._save_progress(tree, "phase4_image")

                # Phase 5: Validate & Repair
                logger.info("[Phase 5/5] 구조 검증 및 복구 중...")
                tree = await self._validate_and_repair(tree)
                logger.info("[Phase 5/5] Validate 완료: 최종 노드=%d", len(tree.nodes))

                logger.info("=== Pipeline Complete: %s (nodes=%d) ===", tree.id, len(tree.nodes))
                return tree

        except asyncio.TimeoutError:
            logger.error("Pipeline timeout exceeded")
            raise RuntimeError("Pipeline timeout exceeded")

    async def _generate_root(
        self,
        phishing_type: str,
        difficulty: str,
        seed_info: str | None
    ) -> tuple[ScenarioNode, dict | None, str | None]:
        """루트 노드 생성 (주인공 정보 + 프롤로그 포함)"""
        result = await generate_root_node(phishing_type, difficulty, seed_info)
        node = result_to_node(result, self._next_node_id(), depth=0)
        return node, result.protagonist, result.prologue

    async def _expand_level(
        self,
        tree: ScenarioTree,
        phishing_type: str,
        difficulty: str,
        frontier: list[tuple[ScenarioNode, Choice]]
    ) -> list[tuple[ScenarioNode, Choice]]:
        """BFS 레벨 확장 (병렬)"""
        tasks = [
            self._expand_single_branch(tree, phishing_type, difficulty, parent, choice)
            for parent, choice in frontier
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        next_frontier = []
        for result in results:
            if isinstance(result, Exception):
                continue
            node, new_choices = result
            next_frontier.extend(new_choices)

        return next_frontier

    async def _expand_single_branch(
        self,
        tree: ScenarioTree,
        phishing_type: str,
        difficulty: str,
        parent: ScenarioNode,
        choice: Choice
    ) -> tuple[ScenarioNode, list[tuple[ScenarioNode, Choice]]]:
        """개별 브랜치 확장"""
        async with self.semaphore:
            # 1. 경로 추적 (parent까지 포함, 중복 append 하지 않음)
            path = self._trace_path_to(tree, parent.id)

            # 2. 자원 계산: path의 choice + 현재 choice 별도 적용
            resources = self._compute_resources(path)
            resources.trust = max(0, min(5,
                resources.trust + choice.resource_effect.trust
            ))
            resources.money = max(0, min(5,
                resources.money + choice.resource_effect.money
            ))
            resources.awareness = max(0, min(5,
                resources.awareness + choice.resource_effect.awareness
            ))

            # 3. 선택 목록: path의 choice + 현재 choice 명시적 추가
            path_choices = [c for _, c in path if c is not None]
            path_choices.append(choice)

            # 4. 종료 신호
            depth = parent.depth + 1
            end_signal = compute_end_signal(
                resources, depth, settings.max_depth, path_choices
            )

            # 5. 컨텍스트 압축 (현재 선택을 별도 전달하여 텍스트 중복 방지)
            story_path = await build_story_path(path, depth, choice_taken=choice)

            # 6. 노드 생성
            context = GenerationContext(
                phishing_type=phishing_type,
                difficulty=difficulty,
                story_path=story_path,
                choice_taken=choice.text,
                current_resources=resources,
                current_depth=depth,
                max_depth=settings.max_depth,
                should_end=end_signal.should_end,
                force_end=end_signal.force,
                ending_type_hint=end_signal.ending_type,
                protagonist=tree.protagonist,
            )

            result = await generate_node(context)
            node = result_to_node(
                result,
                self._next_node_id(),
                depth=depth,
                parent_node_id=parent.id,
                parent_choice_id=choice.id,
            )

            # 7. 트리에 추가
            tree.nodes[node.id] = node
            choice.next_node_id = node.id

            # 다음 프론티어 반환
            if node.type == "narrative" and node.choices:
                return node, [(node, c) for c in node.choices]
            return node, []

    def _trace_path_to(
        self,
        tree: ScenarioTree,
        node_id: str
    ) -> list[tuple[ScenarioNode, Choice | None]]:
        """루트에서 지정 노드까지 경로 추적"""
        path = []
        current_id = node_id

        while current_id:
            node = tree.nodes.get(current_id)
            if not node:
                break

            # 부모에서 이 노드로 온 선택지 찾기
            chosen_choice = None
            if node.parent_node_id and node.parent_choice_id:
                parent = tree.nodes.get(node.parent_node_id)
                if parent:
                    for c in parent.choices:
                        if c.id == node.parent_choice_id:
                            chosen_choice = c
                            break

            path.append((node, chosen_choice))
            current_id = node.parent_node_id

        path.reverse()
        return path

    def _compute_resources(
        self,
        path: list[tuple[ScenarioNode, Choice | None]]
    ) -> Resources:
        """경로의 자원 변동 계산"""
        resources = Resources()  # 기본값: trust=3, money=3, awareness=1

        for _, choice in path:
            if choice and choice.resource_effect:
                resources.trust = max(0, min(5,
                    resources.trust + choice.resource_effect.trust
                ))
                resources.money = max(0, min(5,
                    resources.money + choice.resource_effect.money
                ))
                resources.awareness = max(0, min(5,
                    resources.awareness + choice.resource_effect.awareness
                ))

        return resources

    async def _enrich_endings(self, tree: ScenarioTree, phishing_type: str):
        """엔딩 노드에 교육 콘텐츠 추가"""
        tasks = []

        for node in tree.nodes.values():
            # 엔딩 노드이거나 위험 선택지가 있는 노드
            if node.type.startswith("ending_") or any(c.is_dangerous for c in node.choices):
                tasks.append(self._enrich_single_node(node, phishing_type))

        await asyncio.gather(*tasks, return_exceptions=True)

    async def _enrich_single_node(self, node: ScenarioNode, phishing_type: str):
        """단일 노드에 교육 콘텐츠 추가"""
        async with self.semaphore:
            # 위험 선택지 텍스트 찾기
            dangerous_choice_text = None
            for choice in node.choices:
                if choice.is_dangerous:
                    dangerous_choice_text = choice.text
                    break

            if dangerous_choice_text or node.type.startswith("ending_"):
                content = await enrich_node_with_education(
                    node.text,
                    dangerous_choice_text or "상황 종료",
                    phishing_type
                )
                if content:
                    node.educational_content = content

    async def _generate_images(self, tree: ScenarioTree):
        """
        모든 노드에 이미지 생성 (배치 처리 + 실패 시 재시도)
        
        1차 시도: 모든 노드를 배치로 처리
        2차 시도: 실패한 노드만 순차적으로 재시도 (더 긴 대기시간)
        """
        nodes_to_generate = [
            node for node in tree.nodes.values()
            if node.image_prompt and not node.image_url
        ]

        if not nodes_to_generate:
            return

        total = len(nodes_to_generate)
        logger.info(f"이미지 생성 시작: {total}개 노드")

        # 1차 시도: 배치 병렬 처리
        await self._generate_images_batch(nodes_to_generate, tree.id, "1차")

        # 실패한 노드 확인
        failed_nodes = [node for node in nodes_to_generate if not node.image_url]
        success_count = total - len(failed_nodes)
        
        if failed_nodes:
            logger.warning(f"1차 이미지 생성 결과: {success_count}/{total} 성공, {len(failed_nodes)}개 실패")
            logger.info(f"실패 노드: {[n.id for n in failed_nodes]}")
            
            # 2차 시도: 실패한 노드만 순차 재시도 (더 긴 대기시간)
            logger.info(f"2차 재시도 시작: {len(failed_nodes)}개 노드 (순차 처리)")
            await asyncio.sleep(5.0)  # API 안정화 대기
            
            for i, node in enumerate(failed_nodes):
                logger.info(f"재시도 [{i+1}/{len(failed_nodes)}]: {node.id}")
                await self._generate_single_image(node, tree.id)
                
                if node.image_url:
                    logger.info(f"재시도 성공: {node.id}")
                else:
                    logger.error(f"재시도 실패: {node.id}")
                
                # 순차 처리 시 충분한 대기
                if i < len(failed_nodes) - 1:
                    await asyncio.sleep(2.0)
            
            # 최종 결과
            final_failed = [node for node in nodes_to_generate if not node.image_url]
            final_success = total - len(final_failed)
            logger.info(f"최종 이미지 생성 결과: {final_success}/{total} 성공")
            
            if final_failed:
                logger.warning(f"최종 실패 노드: {[n.id for n in final_failed]}")
        else:
            logger.info(f"이미지 생성 완료: {success_count}/{total} 성공 (모두 성공)")

    async def _generate_images_batch(
        self,
        nodes: list[ScenarioNode],
        scenario_id: str,
        pass_name: str
    ):
        """배치 단위로 이미지 생성"""
        total = len(nodes)
        batch_size = settings.image_batch_size
        
        for i in range(0, total, batch_size):
            batch = nodes[i:i + batch_size]
            batch_num = i // batch_size + 1
            total_batches = (total + batch_size - 1) // batch_size

            logger.info(f"{pass_name} 배치 {batch_num}/{total_batches}: {len(batch)}개 이미지 생성 중...")

            # 배치 내 병렬 생성
            tasks = [self._generate_single_image(node, scenario_id) for node in batch]
            await asyncio.gather(*tasks, return_exceptions=True)

            # 다음 배치 전 대기
            if i + batch_size < total:
                logger.info(f"다음 배치 전 {settings.image_batch_wait}초 대기...")
                await asyncio.sleep(settings.image_batch_wait)

    async def _generate_single_image(self, node: ScenarioNode, scenario_id: str):
        """단일 노드에 이미지 생성"""
        async with self.semaphore:
            if node.image_prompt:
                try:
                    url = await generate_image(node.image_prompt, node.id, scenario_id)
                    if url:
                        node.image_url = url
                except Exception as e:
                    logger.error(f"[{node.id}] 이미지 생성 예외: {e}")

    def _save_progress(self, tree: ScenarioTree, phase: str):
        """파이프라인 진행 상황을 JSON으로 중간 저장"""
        progress_dir = SCENARIOS_DIR / "progress"
        progress_dir.mkdir(parents=True, exist_ok=True)
        filepath = progress_dir / f"{tree.id}.json"
        data = tree.model_dump(mode="json")
        data["_progress"] = {
            "phase": phase,
            "node_count": len(tree.nodes),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        logger.info("Progress saved: %s (%s, nodes=%d)", filepath.name, phase, len(tree.nodes))

    async def _validate_and_repair(self, tree: ScenarioTree) -> ScenarioTree:
        """구조 검증 및 복구"""
        for attempt in range(3):  # 최대 3회 복구 시도
            errors = validate_structure(tree)
            if not errors:
                logger.info("구조 검증 통과 (attempt=%d)", attempt + 1)
                return tree

            logger.warning("구조 검증 오류 %d건 발견, 복구 시도 %d/3", len(errors), attempt + 1)
            tree = repair_tree(tree, errors)

        return tree
