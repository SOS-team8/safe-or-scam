import { useEffect } from 'react'
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
import { ResourceBar } from './ResourceBar'

type GameContainerProps = {
  sessionId: string
}

export function GameContainer({ sessionId }: GameContainerProps) {
  const navigate = useNavigate()
  const snapshot = useGameStore((s) => s.snapshot)
  const dismissPopup = useGameStore((s) => s.dismissPopup)
  const resetStore = useGameStore((s) => s.reset)

  const sessionQuery = useGameSession(sessionId)
  const scenarioQuery = useScenarioDetail(snapshot?.scenarioId)
  const submitMutation = useSubmitChoice(sessionId)

  useEffect(() => () => resetStore(), [resetStore])

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
      />

      {submitError ? (
        <p
          role="alert"
          className="rounded-md border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100"
        >
          {submitError}
        </p>
      ) : null}

      <ChoicePanel
        choices={snapshot.currentNode.choices}
        disabled={submitMutation.isPending || isPopupOpen}
        onChoose={(choiceId) => {
          submitMutation.mutate(choiceId)
        }}
      />

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
