import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { toGameEngineError } from '../api'
import {
  useGameSession,
  useScenarioDetail,
  useSubmitChoice,
} from '../hooks'
import { useGameStore } from '../store'
import { ChoicePanel } from './ChoicePanel'
import { EducationalPopup } from './EducationalPopup'
import { EndingScreen } from './EndingScreen'
import { NarrationPanel } from './NarrationPanel'
import { PrologueScreen } from './PrologueScreen'
import { ResourceBar } from './ResourceBar'

type GameContainerProps = {
  sessionId: string
}

export function GameContainer({ sessionId }: GameContainerProps) {
  const navigate = useNavigate()
  const snapshot = useGameStore((s) => s.snapshot)
  const dismissPopup = useGameStore((s) => s.dismissPopup)
  const startGameAfterPrologue = useGameStore((s) => s.startGameAfterPrologue)
  const resetStore = useGameStore((s) => s.reset)

  const sessionQuery = useGameSession(sessionId)
  const scenarioQuery = useScenarioDetail(snapshot?.scenarioId)
  const submitMutation = useSubmitChoice(sessionId)

  // 이어하기 경로 보강: LobbyPage handleResume 가 store.reset() 직후 navigate 만
  // 하므로, /play/:sessionId 진입 시 store.snapshot 은 null 이다. useGameSession
  // 의 queryFn 내부에도 hydrateApply 가 있지만, React Query 가 동일 sessionId 의
  // cached MoveResponse 로 즉시 응답하면(cache hit) queryFn 이 호출되지 않는
  // 경로가 생긴다 — 그러면 snapshot 이 null 인 채로 GameContainer 의 `!snapshot
  // return null` 분기에 빠져 빈 화면이 보이고, 사용자가 새로고침해야 정상 진입
  // 했다. sessionQuery.data 가 들어오는 순간 mount 후 1회 hydrate 를 보장한다.
  useEffect(() => {
    const data = sessionQuery.data
    if (!data) return
    const current = useGameStore.getState().snapshot
    if (!current || current.sessionId !== data.session_id) {
      useGameStore.getState().applyMove(data)
    }
  }, [sessionQuery.data])

  // 다음 노드 이미지 preload (#53) — GCS 에서 fetch 하는 동안의 latency 가
  // 사용자 체감에 누적되는 걸 막기 위해 현재 노드의 choices 가 가리킬 수 있는
  // 다음 노드들의 image_url 을 미리 받아 브라우저 캐시에 적재한다. 사용자가
  // 선택지를 누르는 시점엔 이미 캐싱되어 즉시 표시.
  // - scenarioQuery 가 전체 tree 를 캐시하므로 next_node_id 로 미리 조회 가능
  // - new Image() 의 src 할당만으로 백그라운드 fetch 발생 (DOM 부착 불필요)
  // - GC 대상이지만 브라우저 HTTP 캐시는 별도라 fetch 결과는 그대로 남음
  useEffect(() => {
    const tree = scenarioQuery.data
    const current = snapshot?.currentNode
    if (!tree || !current) return
    for (const choice of current.choices) {
      const nextId = choice.next_node_id
      if (!nextId) continue
      const nextImg = tree.nodes?.[nextId]?.image_url
      if (!nextImg) continue
      const img = new Image()
      img.src = nextImg
    }
    // currentNode.id 가 바뀌었을 때만 재실행 — 객체 자체를 deps 에 넣으면
    // 매 렌더마다 신규 참조라 무한 preload 트리거.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot?.currentNode?.id, scenarioQuery.data])

  // 현재 노드의 narration 타이핑 완료 여부.
  // 노드가 바뀌면 false로 초기화돼 ChoicePanel을 일시 숨김 — 스포일러 방지.
  // useState로 lastNodeId를 함께 추적해 useEffect setState 패턴을 피한다.
  const currentNodeId = snapshot?.currentNode.id ?? null
  const [narrationState, setNarrationState] = useState<{
    isComplete: boolean
    lastNodeId: string | null
  }>({ isComplete: false, lastNodeId: currentNodeId })
  if (narrationState.lastNodeId !== currentNodeId) {
    setNarrationState({ isComplete: false, lastNodeId: currentNodeId })
  }
  const isNarrationComplete = narrationState.isComplete
  const markNarrationComplete = () =>
    setNarrationState({ isComplete: true, lastNodeId: currentNodeId })

  // NOTE: 이전 버전은 unmount 시 store를 자동 reset하는 useEffect를 두었으나,
  // React 19 + StrictMode dev 환경에서 setup→cleanup→setup 사이클로 cleanup이
  // mount 직후 1회 실행되어 prologue snapshot이 즉시 null이 되는 회귀가 있었다.
  // store reset은 명시적 흐름(EndingScreen onReplay/onSelectOther, LobbyPage
  // handleResume, useCreateGameSession mutationFn 시작 시점)에서 충분히
  // 다뤄지므로 cleanup useEffect는 제거한다. 회귀 테스트:
  //   - features/game/__tests__/cleanup-effect.test.tsx
  //   - features/game/__tests__/lobby-to-game-prologue.test.tsx

  if (sessionQuery.isPending) {
    return (
      <section
        role="status"
        aria-live="polite"
        className="space-y-4 rounded-lg border border-white/10 bg-white/5 p-6 text-sm text-slate-300"
      >
        세션을 불러오고 있어요...
      </section>
    )
  }

  if (sessionQuery.isError) {
    return (
      <section
        role="alert"
        className="space-y-3 rounded-lg border border-red-300/30 bg-red-500/10 p-6"
      >
        <p className="text-sm font-semibold text-red-100">
          세션을 불러오지 못했어요
        </p>
        <p className="text-sm text-red-100/80">
          {toGameEngineError(sessionQuery.error).message}
        </p>
        <button
          type="button"
          onClick={() => navigate('/lobby', { replace: true })}
          className="rounded-md border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 hover:border-emerald-300 hover:text-white"
        >
          로비로 돌아가기
        </button>
      </section>
    )
  }

  if (!snapshot) return null

  const submitError = submitMutation.error
    ? toGameEngineError(submitMutation.error).message
    : null

  const popupContent = snapshot.pendingEducationalContent
  const isPopupOpen = Boolean(popupContent)

  // Prologue 화면 — 시작 전 시나리오 설명.
  // scenarioQuery가 완료되어 prologue가 비어있는 게 확인되면 자동 진행
  // (안전 분기). 사용자가 hydrateFromSession에서 prologue를 받지 못한 케이스 보완.
  // 이미지는 첫 노드 narration 단계에서 비로소 노출 — prologue 단계에서 root 노드
  // 이미지를 미리 보여주면 첫 노드 진입 시 동일 이미지가 중복 등장하므로 생략한다.
  if (snapshot.phase === 'prologue') {
    const prologueText = scenarioQuery.data?.prologue ?? null
    if (scenarioQuery.isSuccess && (!prologueText || prologueText.trim() === '')) {
      // 다음 렌더에서 곧장 playing으로 진행.
      queueMicrotask(() => startGameAfterPrologue())
      return null
    }
    return (
      <PrologueScreen
        title={scenarioQuery.data?.title ?? ''}
        prologue={prologueText ?? ''}
        onStart={() => startGameAfterPrologue()}
        isLoading={scenarioQuery.isPending}
      />
    )
  }

  if (snapshot.isFinished && snapshot.endingType) {
    return (
      <EndingScreen
        endingNode={snapshot.currentNode}
        endingType={snapshot.endingType}
        endingCategoryLabel={
          snapshot.endingCategory
            ? scenarioQuery.data?.ending_categories?.[snapshot.endingCategory]?.label ??
              snapshot.endingCategory
            : null
        }
        resources={snapshot.resources}
        history={snapshot.history}
        scenarioTree={scenarioQuery.data ?? null}
        unlockedAchievements={snapshot.unlockedAchievements}
        onReplay={() => {
          resetStore()
          navigate('/lobby', { replace: true })
        }}
        onSelectOther={() => {
          resetStore()
          navigate('/lobby', { replace: true })
        }}
      />
    )
  }

  return (
    <section className="space-y-6">
      <ResourceBar
        resources={snapshot.resources}
        previousResources={snapshot.previousResources}
      />

      <NarrationPanel
        text={snapshot.currentNode.text}
        imageUrl={snapshot.currentNode.image_url}
        onTypingComplete={markNarrationComplete}
      />

      {submitError ? (
        <p
          role="alert"
          className="rounded-md border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100"
        >
          {submitError}
        </p>
      ) : null}

      {/* 타이핑 진행 중이면 선택지를 숨겨 스포일러 방지. ending 노드는 choices=[] 라 자연스럽게 비표시. */}
      {isNarrationComplete ? (
        <div className="animate-sos-fade-slide">
          <ChoicePanel
            choices={snapshot.currentNode.choices}
            disabled={submitMutation.isPending || isPopupOpen}
            onChoose={(choiceId) => {
              submitMutation.mutate(choiceId)
            }}
          />
        </div>
      ) : null}

      {popupContent ? (
        <EducationalPopup
          content={popupContent}
          isOpen={isPopupOpen}
          onDismiss={dismissPopup}
        />
      ) : null}
    </section>
  )
}
