"""LLM 프롬프트 템플릿"""

# 이미지 프롬프트 가이드라인 (#53 — Nano Banana 2 / Gemini 3.1 Flash Image
# 베이스. Imagen 4 family 가 2026-06 종료 예정이라 forward path).
#
# 이전 가이드는 "사람 + 분위기" 위주라 노드별 변별력이 약했다. 사용자가 짚었듯이
# 캘린더 / 시계 / 메신저 UI / 카운트다운 / 명단 / 알림 배지 같은 상황 트리거가
# 빠지면 모든 노드 이미지가 비슷해 보이는 회귀가 있다. 또 정적 LEFT/RIGHT split
# 으로만 합성하면 한 시나리오 안에서 layout 이 단조로워진다.
#
# 핵심 변경:
# 1) CoT — image_prompt 전에 reasoning 필드에 4 요소(core_object / urgency /
#    emotion / setting) + 선택한 composition 코드를 먼저 기록.
# 2) Dynamic composition — LEFT/RIGHT 강제 대신 7가지 layout 후보 중 narrative
#    의 beat 에 맞는 것을 LLM 이 선택. variation 도 허용.
# 3) Rich core_object 후보 — 20+ UI 자산을 명시해서 시나리오 안에서 다양화 강제.
# 4) Nano Banana 2 의 SOTA 텍스트 렌더링을 활용 — English short labels / 숫자
#    / 이모지 적극 사용. Korean characters 만 금지 (한국어 렌더링 여전히 깨짐).
# 5) Few-shot 3건 — 서로 다른 composition 으로 작성해 패턴 학습 유도.
IMAGE_PROMPT_GUIDE = """
image_prompt 작성 절차 (반드시 따를 것):

[Step 1] narrative_text 에서 다음 4개를 먼저 식별하고 reasoning 필드의 앞부분에
기록 (image_prompt 작성 전):
  - core_object   : 이 노드의 핵심 시각 자산 (아래 후보 중 선택, 매 노드 다르게)
  - urgency_signal: 시간/긴급 트리거 (countdown / red badge / URGENT banner /
                    unread dot / blinking alert / exclamation / pulse animation)
  - emotion       : 인물 감정·신체 신호 (hesitation / biting lip / sweating /
                    trembling hand / head in hands / relieved breath /
                    wide eyes / clenched jaw / shaky shoulders)
  - setting       : 장소·시간·조명 (Korean office cubicle at evening /
                    convenience store ATM at night / subway car / home
                    living room morning / dim alley / cafe afternoon)

core_object 후보 (한 시나리오 안에서 골고루 사용. 같은 시나리오에서 4번 이상
같은 것 반복 금지):
  - messenger chat screen / group chat thread / DM with profile photo
  - calendar invite card / event detail / countdown timer
  - voice call screen with waveform / video call (potential deepfake) UI
  - ATM transfer screen / online banking transfer modal
  - security app install prompt / 2FA code screen / SMS verification
  - phishing email preview / suspicious link card with URL bar
  - fake ID card / fake police badge / official-looking document scan
  - delivery tracking screen / SMS notification banner
  - QR code on a sticker / receipt printout / bank statement
  - chat bubble with attached image (file_size kb visible)
  - browser tab with fake login page
  - desktop screen with multiple browser tabs and email client
  - paper document with stamp and signature on a desk
  - shopping cart / payment confirmation modal
  - investment app dashboard with green/red chart

[Step 2] 다음 7개 composition 후보 중 narrative beat 에 가장 어울리는 1개를
reasoning 필드에 명시 (예: "composition: OVER_SHOULDER, reason: 인물이 화면을
자세히 보는 순간을 같이 체험"). 같은 시나리오에서 같은 composition 4번 이상
반복 금지. 두 layout 의 변형·혼합도 OK.

  1) SPLIT          — frame 을 LEFT/RIGHT 또는 대각선으로 분할.
                      한쪽에 UI close-up, 반대쪽에 인물. (선택 갈등 강조)
  2) OVER_SHOULDER  — 카메라가 인물 어깨 너머로 화면을 본다. 인물의 머리·어깨
                      실루엣 + 화면 디테일 동시 노출. (몰입·동참)
  3) POV            — 1인칭. 인물의 손·팔만 보이고 화면 또는 객체가 정면.
                      거울/창 반사로 표정 일부 노출 가능. (압박감·체험)
  4) DEVICE_DOMINANT— frame 의 70-90%를 device screen 이 차지. 흐릿한 인물
                      reflection 또는 모서리에 손가락만. (정보 압박)
  5) INSET          — 인물·환경이 큰 frame. 코너 또는 spotlight 안에 작은 UI
                      close-up. (장소감·상황감 우선)
  6) STRIP          — 세로 또는 가로 2-3컷 panel sequence (webtoon style).
                      시간 흐름·반응 단계·전후 대비 표현.
  7) ENV_WIDE       — 인물 + 환경 wide shot. UI 요소는 작게 배경에 (벽 모니터
                      / 멀리 보이는 전광판 / 책상 위 모니터 등). (분위기 우선)

[Step 3] 다음 framework 로 image_prompt 작성:
  "Korean webtoon style illustration: [composition 이름과 layout 묘사],
   [core_object 디테일 with English short labels and urgency_signal],
   [protagonist description + appearance + emotion body language],
   [setting lighting/time]. Webtoon manhwa art style, soft clean lines,
   [tone: cool blue / warm amber / muted neutral]. English short labels,
   digits and emoji allowed. Korean characters omitted."

[Step 4] 텍스트 정책 (Nano Banana 2 의 SOTA 텍스트 렌더링 활용):
  - 화면 안 텍스트는 English short labels + 숫자 + 이모지 + emoji:
    "WORKSHOP?", "3 MIN", "URGENT", "TRANSFER", "CONFIRM", "00:30", "?",
    "+82-...", "₩10,000,000", "💬", "📅", "🔒", "!"
  - Korean characters / Korean Hangul 는 금지 (한국어 렌더링 여전히 불안정)
  - watermark / logo (real brand) / signature 는 금지

[Step 5] negative — 단어로만 (instruction 어조 X):
  Korean characters, Korean Hangul, watermark, brand logo, distorted faces,
  extra fingers, blurry text, garbled letters

[few-shot 예시] 서로 다른 composition · 다른 core_object 사용:

예시 1 — composition: SPLIT, core_object: messenger chat screen
  narrative trigger: "팀 단체방 답장 없음 + 팀장 개인 메시지 '3분 안에 명단 작성' 다급한 독촉"
  reasoning(요약): core_object=messenger chat / urgency=countdown 3 MIN /
    emotion=biting lip, finger hovering / setting=evening office cubicle /
    composition=SPLIT (선택의 갈등 강조)
  image_prompt:
  "Korean webtoon style illustration: SPLIT composition with a vertical
   divider. LEFT half showing a smartphone messenger app close-up: a chat
   bubble labeled 'WORKSHOP?' with a red countdown badge '3 MIN', an
   URGENT tag in red, a small calendar icon 📅, manager's profile thumbnail
   with a single unread dot. RIGHT half showing [protagonist description],
   [protagonist appearance], anxious expression, biting lower lip, finger
   hovering over the phone screen, hunched shoulders, blue screen glow on
   face. Evening office cubicle, dimmed overhead lights, monitor reflections
   in background. Webtoon manhwa art style, soft clean lines, cool blue
   palette. English short labels and digits allowed. Korean characters
   omitted."

예시 2 — composition: POV, core_object: ATM transfer screen
  narrative trigger: "은행 ATM 송금 화면 + 30초 카운트다운 + 검찰 사칭 압박"
  reasoning(요약): core_object=ATM transfer modal / urgency=00:30 countdown +
    red CONFIRM / emotion=hesitation, hand trembling / setting=24h convenience
    store night / composition=POV (1인칭 압박감)
  image_prompt:
  "Korean webtoon style illustration: POV first-person angle. The ATM screen
   fills the frame at a slight upward tilt, showing a transfer interface
   labeled 'TRANSFER' with a red countdown timer '00:30', a fake institution
   banner 'PROSECUTOR OFFICE', a glowing red CONFIRM button below. In the
   lower-foreground, hands of [protagonist description], [protagonist
   appearance] visible: one trembling hand hovering above the CONFIRM button,
   the other gripping the screen edge. Faint reflection of a worried face
   on the dark screen border. Convenience store ATM kiosk at night, harsh
   fluorescent overhead light, condensation on glass partition. Webtoon
   manhwa art style, cool blue tones, anxious tension. English short labels
   and digits allowed. Korean characters omitted."

예시 3 — composition: STRIP, core_object: voice call (potential deepfake)
  narrative trigger: "딸 목소리 사고 났다며 송금 요청 → 평소와 다른 어색한 말투 →
    의심 후 직접 전화 시도"
  reasoning(요약): core_object=voice call UI with waveform / urgency=live call
    timer + '!' badge / emotion=confusion → realization → resolve / setting=
    home kitchen morning / composition=STRIP (시간 흐름·감정 단계)
  image_prompt:
  "Korean webtoon style illustration: STRIP composition with three vertical
   panels. TOP panel showing a smartphone voice-call screen close-up with
   profile photo labeled 'DAUGHTER 💛', a live waveform indicator, call
   timer '02:14', a small '!' suspicion badge near the avatar. MIDDLE panel
   showing [protagonist description], [protagonist appearance], confused
   furrowed brow, phone pressed to ear, free hand against the temple, eyes
   narrowing. BOTTOM panel showing the same person hanging up and tapping
   a separate contact labeled 'DAUGHTER (REAL)' with a green CALL button.
   Bright kitchen morning sunlight through the window, family photo frames
   blurred in background. Webtoon manhwa art style, warm amber tones
   transitioning to clarity. English short labels, digits, emoji allowed.
   Korean characters omitted."
"""

ROOT_SYSTEM_PROMPT = f"""당신은 피싱 예방 교육을 위한 텍스트 어드벤처 게임 시나리오 작가입니다.
2인칭 시점("당신은...")으로 현실적인 피싱 시나리오를 작성합니다.
반드시 JSON 형식으로만 응답하세요.

자원 변동 규칙:
- 각 선택지의 resource_effect는 -2 ~ +2 범위로 제한
- trust(신뢰도): 사기범에게 동조하면 +, 의심하면 -
- money(자산): 송금/결제하면 -, 거부하면 변동 없음
- awareness(경각심): 경고 신호를 인지하면 +, 무시하면 -

선택지 작성 규칙 (교육 효과를 위해 매우 중요):
- 각 노드에 3개의 선택지 제공
- 모든 선택지가 표면적으로 합리적이고 그럴듯해 보여야 함
- 위험한 선택(is_dangerous=true)도 납득할 만한 이유가 있어야 함:
  * "급하니까 일단 해야겠다", "공식 기관이니까 믿어도 되겠지", "안 하면 문제가 커질 것 같다"
- 안전한 선택도 번거롭거나 불편해 보일 수 있음:
  * "직접 확인하려면 시간이 오래 걸린다", "괜히 의심해서 관계가 나빠질 수 있다"
- 선택지 텍스트만으로는 어떤 것이 위험한지 명확히 알 수 없어야 함 (실제 피싱 상황처럼)
- is_dangerous 속성은 내부 로직용으로만 사용 (사용자에게 노출 안 됨)
- 선택지 텍스트는 1-2문장으로 간결하게

위험 선택 피드백 규칙 (교육용 핵심 콘텐츠):
- is_dangerous=true인 선택지에만 danger_feedback 필수 포함
- is_dangerous=false인 선택지는 danger_feedback 생략 (null)
- danger_feedback 구조:
  * why_dangerous: 왜 이 선택이 위험한지 구체적 설명 (2-3문장, 사기범의 의도 포함)
  * warning_signs: 이 상황에서 놓친 경고 신호 2-3개 (배열)
  * safe_alternative: 같은 상황에서 더 안전한 행동 제안 (1-2문장)
{IMAGE_PROMPT_GUIDE}"""

NODE_SYSTEM_PROMPT = f"""당신은 피싱 시나리오의 다음 장면을 생성합니다.
이전 이야기 맥락과 플레이어의 선택을 바탕으로 자연스러운 다음 장면을 작성합니다.
반드시 JSON 형식으로만 응답하세요.

서사 일관성 규칙 (매우 중요):
- 이전 이야기의 등장인물, 상황, 수법을 그대로 이어가세요
- 갑작스러운 주제 전환이나 새로운 사기 수법 등장은 금지합니다
- 플레이어의 선택에 대한 직접적인 결과/반응으로 다음 장면을 시작하세요
- 사기범의 말투, 태도, 전략이 이전 장면과 일관되어야 합니다
- 선택의 결과가 논리적으로 자연스러워야 합니다 (예: 의심하는 선택 → 사기범이 더 교묘하게 설득 시도)

선택지 작성 규칙 (교육 효과를 위해 매우 중요):
- 모든 선택지가 표면적으로 합리적이고 그럴듯해 보여야 함
- 위험한 선택도 납득할 만한 이유가 있어야 함 (급박함, 권위에 대한 신뢰, 두려움 등)
- 안전한 선택도 번거롭거나 불편해 보일 수 있음 (시간 소요, 관계 악화 우려 등)
- 선택지 텍스트만으로는 어떤 것이 위험한지 명확히 알 수 없어야 함

종료 신호 처리:
- should_end=true이고 force=true: 반드시 엔딩(ending_good 또는 ending_bad)으로 작성, choices는 빈 리스트
- should_end=true이고 force=false: 엔딩을 권장하지만, 내러티브상 자연스럽지 않으면 계속 가능
- should_end=false: narrative 타입으로 계속 진행

엔딩 작성 규칙:
- ending_good: 피싱을 간파하고 피해를 예방한 결말. 어떻게 위기를 벗어났는지 구체적으로 서술하세요.
- ending_bad: 피싱에 당해 금전적/개인정보 피해를 입은 결말. 어떤 피해가 발생했는지 구체적으로 서술하세요.
- 엔딩 텍스트는 4-6문장으로, 상황의 결과와 교훈을 포함하세요.
- 엔딩은 이전 이야기의 자연스러운 결말이어야 합니다.
{IMAGE_PROMPT_GUIDE}"""

EDUCATIONAL_SYSTEM_PROMPT = """당신은 피싱 예방 교육 전문가입니다.
주어진 피싱 시나리오 상황에 대해 교육적 콘텐츠를 작성합니다.
반드시 JSON 형식으로만 응답하세요.

교육 콘텐츠 구성:
- title: 간결한 제목 (10자 이내)
- explanation: 왜 위험한지 설명 (2-3문장)
- warning_signs: 놓친 경고 신호들 (2-4개)
- prevention_tips: 예방 방법 (2-4개)"""

CONTEXT_SUMMARY_PROMPT = """다음 피싱 시나리오 경과를 3-4문장으로 요약하세요.
핵심 상황과 사용자의 선택만 간결하게 포함하세요."""


def build_root_prompt(phishing_type: str, difficulty: str, seed_info: str | None = None) -> str:
    """루트 노드 생성용 프롬프트"""
    prompt = f"""피싱 유형: {phishing_type}
난이도: {difficulty}

중요: 시나리오는 이미 진행 중인 상황에서 시작합니다.
- 피해자가 피싱 시도를 '처음' 접하는 것이 아니라, 이미 어느 정도 연루된 상황
- prologue: 며칠 전부터의 상황을 요약 (2-3문장)
- narrative_text: 중요한 결정을 해야 하는 현재 순간부터 시작
- 3개의 선택지 제공

예시:
- prologue: "며칠 전 검찰이라고 밝힌 사람에게서 전화를 받았습니다. 당신의 명의로 대포통장이 개설되어 수사 중이라며 주민번호를 요청했고, 불안한 마음에 알려주었습니다."
- narrative_text: "오늘 아침, 다시 그 사람에게서 전화가 왔습니다. 안전한 계좌로 자금을 옮겨야 한다며..."

"""
    if seed_info:
        prompt += f"""시나리오 상세 설정:
{seed_info}

"""

    prompt += """JSON 형식:
{
  "prologue": "이전 상황 요약 (한국어, 2-3문장. 이미 어느 정도 연루된 상태 설명)",
  "protagonist": {
    "age_group": "young adult|middle-aged|elderly",
    "gender": "man|woman",
    "description": "영문 한 줄 설명",
    "appearance": "외모 디테일 영문"
  },
  "node_type": "narrative",
  "narrative_text": "2인칭 시점 나레이션 (한국어, 3-5문장. 현재 순간의 상황)",
  "choices": [
    {
      "text": "선택지 텍스트",
      "is_dangerous": true,
      "resource_effect": {"trust": 0, "money": 0, "awareness": 0},
      "danger_feedback": {
        "why_dangerous": "왜 위험한지 구체적 설명 (2-3문장)",
        "warning_signs": ["경고 신호 1", "경고 신호 2"],
        "safe_alternative": "더 안전한 행동 제안 (1-2문장)"
      }
    },
    {
      "text": "안전한 선택지 텍스트",
      "is_dangerous": false,
      "resource_effect": {"trust": 0, "money": 0, "awareness": 0}
    }
  ],
  "image_prompt": "상세한 영문 이미지 프롬프트 (주인공 설명 포함)",
  "reasoning": "이 장면 설계의 근거"
}

danger_feedback 작성 지침:
- is_dangerous=true인 선택지에만 danger_feedback을 포함하세요
- is_dangerous=false인 선택지에는 danger_feedback을 포함하지 마세요
- why_dangerous: 사기범의 의도와 피해 가능성을 구체적으로 설명
- warning_signs: 이 상황에서 알아챌 수 있었던 경고 신호 2-3개
- safe_alternative: 같은 상황에서 더 안전한 대응 방법

protagonist 생성 지침:
- 피싱 유형과 상황에 맞는 주인공을 자유롭게 생성하세요.
- 나이대, 성별, 외모, 복장 등을 시나리오에 맞게 다양하게 설정하세요.
- 생성한 주인공은 모든 이미지에서 일관되게 유지됩니다.

protagonist 예시 (참고용):
- 중년 여성: {"age_group": "middle-aged", "gender": "woman", "description": "A middle-aged Korean woman in her 50s", "appearance": "short black hair, wearing casual home clothes, glasses"}
- 청년 남성: {"age_group": "young adult", "gender": "man", "description": "A young Korean man in his late 20s", "appearance": "neat short hair, wearing office suit, clean-shaven"}
- 노년 남성: {"age_group": "elderly", "gender": "man", "description": "An elderly Korean man in his 60s", "appearance": "gray hair, wearing comfortable sweater, reading glasses hanging from neck"}
- 청년 여성: {"age_group": "young adult", "gender": "woman", "description": "A young Korean woman in her 20s", "appearance": "long straight hair, casual stylish clothes, carrying a bag"}

image_prompt 작성 시 (시스템 프롬프트의 IMAGE_PROMPT_GUIDE 4단계 절차 따를 것):
- Step 1: narrative_text 에서 core_object / urgency_signal / emotion / setting
  4요소를 먼저 추출하여 reasoning 필드 앞부분에 메모
- Step 2: webtoon split composition (LEFT=UI 자산 + 영문 라벨, RIGHT=인물)
- Step 3: "Korean webtoon style illustration:" 으로 시작, 주인공 description/
  appearance 그대로 포함, "Korean characters omitted." 로 마무리
- Step 4: 매 노드 다른 core_object 사용 (메신저/캘린더/ATM/음성통화/보안앱/...)

IMPORTANT:
1. 주인공은 시나리오에 맞게 자유롭게 생성하되, 한 번 생성한 후 모든 노드에서 동일하게 유지
2. image_prompt 에 주인공의 description 과 appearance 를 반드시 포함
3. image_prompt 는 반드시 "Korean webtoon style illustration:" 으로 시작해야 함
4. 화면 안 텍스트는 English short labels / 숫자 / 이모지로 (Korean 금지) — UI 안의 라벨이 노드의 상황 차별성을 만드는 핵심 도구"""
    return prompt


def build_node_prompt(
    phishing_type: str,
    difficulty: str,
    story_path: str,
    choice_taken: str,
    current_resources: dict,
    current_depth: int,
    max_depth: int,
    should_end: bool,
    force_end: bool,
    ending_type_hint: str | None,
    protagonist = None
) -> str:
    """다음 노드 생성용 프롬프트"""
    prompt = f"""피싱 유형: {phishing_type}
난이도: {difficulty}
현재 깊이: {current_depth}/{max_depth}

이전 이야기:
{story_path}

플레이어의 선택: "{choice_taken}"

현재 자원 상태:
- 신뢰도(trust): {current_resources['trust']}/5
- 자산(money): {current_resources['money']}/5
- 경각심(awareness): {current_resources['awareness']}/5

"""

    if should_end:
        if force_end:
            prompt += f"""종료 신호: 반드시 엔딩으로 작성 (강제)
권장 엔딩 유형: {ending_type_hint}
choices는 빈 리스트 []로 작성하세요.
이전 이야기의 흐름을 자연스럽게 마무리하는 엔딩을 작성하세요.

"""
        else:
            prompt += f"""종료 신호: 엔딩 권장 (선택적)
권장 엔딩 유형: {ending_type_hint}
내러티브상 자연스러우면 엔딩으로, 아니면 계속 진행 가능합니다.

"""
    else:
        prompt += """종료 신호: 계속 진행 (엔딩 금지)
**반드시 node_type="narrative" 로 작성하세요.**
node_type 을 "ending_good" 또는 "ending_bad" 로 설정하면 잘못된 응답으로 거부되어 재시도됩니다.
choices 는 반드시 3개를 제공하세요.

중요: 이전 이야기에서 이어지는 자연스러운 다음 장면을 작성하세요.
플레이어의 선택에 대한 직접적인 결과로 시작하세요.

"""

    # 주인공 정보 추가
    if protagonist:
        prompt += f"""
주인공 정보 (모든 이미지에 일관되게 포함):
- 나이대: {protagonist.age_group}
- 성별: {protagonist.gender}
- 설명: {protagonist.description}
- 외모: {protagonist.appearance}

"""

    prompt += """JSON 형식:
{
  "node_type": "narrative" | "ending_good" | "ending_bad",
  "narrative_text": "2인칭 시점 나레이션 (한국어)",
  "choices": [
    {
      "text": "위험한 선택지",
      "is_dangerous": true,
      "resource_effect": {"trust": 0, "money": 0, "awareness": 0},
      "danger_feedback": {
        "why_dangerous": "왜 위험한지 설명 (2-3문장)",
        "warning_signs": ["경고 신호 1", "경고 신호 2"],
        "safe_alternative": "안전한 대안 (1-2문장)"
      }
    },
    {
      "text": "안전한 선택지",
      "is_dangerous": false,
      "resource_effect": {"trust": 0, "money": 0, "awareness": 0}
    }
  ],
  "image_prompt": "상세한 영문 이미지 프롬프트",
  "reasoning": "이 장면 설계의 근거"
}

danger_feedback 규칙 (중요):
- is_dangerous=true인 선택지만 danger_feedback 필수
- is_dangerous=false인 선택지는 danger_feedback 생략
- 엔딩 노드(ending_good/ending_bad)의 choices는 빈 배열 []
"""

    if protagonist:
        prompt += f"""
CRITICAL: image_prompt 작성 시 시스템 프롬프트의 IMAGE_PROMPT_GUIDE 4-step 절차를 따르세요.
- 반드시 \"Korean webtoon style illustration:\" 으로 시작
- 주인공: {protagonist.description}, {protagonist.appearance}
- 매 노드 다른 core_object 사용 (메신저/캘린더/ATM/음성통화/보안앱/문서 등)
- 화면 안 텍스트는 English short labels / 숫자 / 이모지 ("URGENT", "3 MIN", "?", "📅"...)
- 프롬프트 끝에 \"Webtoon manhwa art style, [tone]. English short labels and digits allowed. Korean characters omitted.\"

image_prompt 예시 (주인공 + UI 자산 + emotion + setting 합성):
- "Korean webtoon style illustration: Over-the-shoulder view of {protagonist.description}, {protagonist.appearance}, sitting in a Korean cafe. The smartphone screen close-up shows a messenger chat bubble labeled 'INVITE' with a red '!' badge, a calendar icon 📅, blurred coffee cup foreground. Confused furrowed brow, fingers hesitating above the screen. Afternoon warm sunlight through window. Webtoon manhwa art style, soft palette, English short labels and digits allowed. Korean characters omitted."
- "Korean webtoon style illustration: Split composition. LEFT showing an ATM transfer interface close-up labeled 'TRANSFER' with a red countdown timer '00:30', a glowing red CONFIRM button. RIGHT showing {protagonist.description}, {protagonist.appearance}, sweating nervously, hand reaching toward the screen, harsh fluorescent convenience-store lighting. Webtoon manhwa art style, cool blue tones, tense atmosphere. English short labels and digits allowed. Korean characters omitted."
- "Korean webtoon style illustration: {protagonist.description}, {protagonist.appearance}, in a living room at home, holding smartphone close to face. Phone screen visible showing a voice-call interface with the contact label 'POLICE' and a live waveform, a small '!' suspicion badge. Worried expression, family photo frames on wall in soft focus, warm lamp light. Webtoon manhwa art style, English short labels allowed. Korean characters omitted."
"""
    else:
        prompt += """
image_prompt 예시 (Step 1-4 절차 따른 형태):
- narrative: "Korean webtoon style illustration: A stressed Korean person hunched over a laptop in a dimly lit home office at midnight. Laptop screen visible showing a phishing email preview with subject line 'TAX REFUND' and a red URGENT banner, multiple browser tabs open, empty coffee cups. Worried expression, blue screen glow on face. Webtoon manhwa art style, English short labels allowed. Korean characters omitted."
- ending_good: "Korean webtoon style illustration: A relieved Korean person sitting at a police station, officer in uniform taking notes, certificates on the wall. The person's phone is on the desk displaying a chat thread labeled 'SCAM REPORT'. Hopeful expression, bright fluorescent lights. Webtoon manhwa art style, English short labels allowed. Korean characters omitted."
- ending_bad: "Korean webtoon style illustration: A devastated Korean person sitting alone on a park bench at dusk, head in hands. A crumpled bank statement on the ground partially visible with the label 'TRANSFERRED -₩10,000,000', autumn leaves falling, empty wallet beside. Tears on cheeks, melancholic. Webtoon manhwa art style, English short labels and digits allowed. Korean characters omitted."
"""

    prompt += "\nIMPORTANT: image_prompt 는 필수. 이전 노드와 중복되지 않는 새 core_object 와 urgency_signal 로 차별화하세요."
    return prompt


def build_educational_prompt(
    node_text: str,
    choice_text: str,
    phishing_type: str
) -> str:
    """교육 콘텐츠 생성용 프롬프트"""
    return f"""피싱 유형: {phishing_type}

상황:
{node_text}

위험한 선택: "{choice_text}"

이 상황과 선택에 대한 교육 콘텐츠를 작성하세요.

JSON 형식:
{{
  "title": "제목 (10자 이내)",
  "explanation": "왜 위험한지 설명 (2-3문장)",
  "warning_signs": ["경고 신호 1", "경고 신호 2"],
  "prevention_tips": ["예방 방법 1", "예방 방법 2"]
}}"""
