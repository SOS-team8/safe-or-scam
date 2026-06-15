import { useMemo, useState } from 'react'

import { AchievementUnlockedDialog } from '@/features/achievement/components/AchievementUnlockedDialog'

import type {
  ChoiceHistoryEntry,
  EndingType,
  Resources,
  ScenarioNode,
  ScenarioTree,
  UnlockedAchievement,
} from '../types'
import { DangerFeedbackModal } from './DangerFeedbackModal'
import { ResourceBar } from './ResourceBar'

type EndingScreenProps = {
  endingNode: ScenarioNode
  endingType: EndingType
  endingCategoryLabel?: string | null
  resources: Resources
  history: ChoiceHistoryEntry[]
  scenarioTree?: ScenarioTree | null
  unlockedAchievements?: UnlockedAchievement[]
  onReplay: () => void
  onSelectOther: () => void
}

const buildChoiceLookup = (tree: ScenarioTree | null | undefined) => {
  const map = new Map<string, { text: string; isDangerous: boolean }>()
  if (!tree) return map
  for (const node of Object.values(tree.nodes)) {
    for (const choice of node.choices) {
      map.set(`${node.id}::${choice.id}`, {
        text: choice.text,
        isDangerous: choice.is_dangerous,
      })
    }
  }
  return map
}

export function EndingScreen({
  endingNode,
  endingType,
  endingCategoryLabel,
  resources,
  history,
  scenarioTree,
  unlockedAchievements = [],
  onReplay,
  onSelectOther,
}: EndingScreenProps) {
  const isGood = endingType === 'ending_good'

  // 결말 도달로 새로 달성한 업적이 있으면 축하 모달을 띄운다(확인 시 닫힘).
  const [showUnlockedDialog, setShowUnlockedDialog] = useState(unlockedAchievements.length > 0)

  const choiceLookup = useMemo(() => buildChoiceLookup(scenarioTree), [scenarioTree])

  type FeedbackTarget = {
    choiceId: string
    nodeId: string
    text: string
  }
  const [feedbackTarget, setFeedbackTarget] = useState<FeedbackTarget | null>(null)

  // 엔딩 노드 이미지. NarrationPanel과 동일 패턴: imageUrl 변경 시 failed 초기화.
  // useState로 lastUrl을 추적해 render-time 동기화.
  const endingImageUrl = endingNode.image_url
  const [imageFailedState, setImageFailedState] = useState<{
    failed: boolean
    lastUrl: string | null | undefined
  }>({ failed: false, lastUrl: endingImageUrl })
  if (imageFailedState.lastUrl !== endingImageUrl) {
    setImageFailedState({ failed: false, lastUrl: endingImageUrl })
  }
  const showEndingImage = Boolean(endingImageUrl) && !imageFailedState.failed

  const feedbackForTarget = useMemo(() => {
    if (!feedbackTarget || !scenarioTree) return null
    const node = scenarioTree.nodes[feedbackTarget.nodeId]
    const choice = node?.choices.find((c) => c.id === feedbackTarget.choiceId)
    return choice?.danger_feedback ?? null
  }, [feedbackTarget, scenarioTree])

  return (
    <section className="space-y-6 animate-sos-fade-slide">
      {showUnlockedDialog ? (
        <AchievementUnlockedDialog
          achievements={unlockedAchievements.map((a) => ({
            code: a.code,
            title: a.title,
            description: a.description,
            iconUrl: a.icon_url,
          }))}
          onClose={() => setShowUnlockedDialog(false)}
        />
      ) : null}

      <header
        className={`space-y-3 rounded-lg border p-6 ${
          isGood
            ? 'border-emerald-300/30 bg-emerald-300/10'
            : 'border-red-300/30 bg-red-500/10'
        }`}
      >
        <p
          className={`text-sm font-semibold ${
            isGood ? 'text-emerald-200' : 'text-red-100'
          }`}
        >
          {isGood ? '안전한 결말' : '주의가 필요한 결말'}
        </p>
        <h1 className="text-3xl font-semibold text-sos-strong">
          {isGood ? '안전하게 마무리했어요' : '아쉽게 사기에 노출됐어요'}
        </h1>
        {endingCategoryLabel ? (
          <p className="text-sm text-slate-200">
            결말 유형: <span className="font-semibold">{endingCategoryLabel}</span>
          </p>
        ) : null}
        {showEndingImage ? (
          <div className="overflow-hidden rounded-md border border-white/10 bg-slate-900">
            <img
              src={endingImageUrl ?? undefined}
              alt=""
              aria-hidden="true"
              onError={() =>
                setImageFailedState({ failed: true, lastUrl: endingImageUrl })
              }
              className="block h-full w-full object-cover"
            />
          </div>
        ) : null}
        <p className="text-base leading-7 text-slate-200">{endingNode.text}</p>
      </header>

      <section className="space-y-3 rounded-xl border border-sos-line bg-sos-surface-1 p-6">
        <h2 className="text-xl font-semibold text-sos-strong">최종 자원</h2>
        <ResourceBar resources={resources} />
      </section>

      <section className="space-y-3 rounded-xl border border-sos-line bg-sos-surface-1 p-6">
        <h2 className="text-xl font-semibold text-sos-strong">선택 이력</h2>
        {history.length === 0 ? (
          <p className="text-sm text-sos-muted">선택 이력이 없습니다.</p>
        ) : (
          <ol className="space-y-2">
            {history.map((entry, idx) => {
              const lookup = choiceLookup.get(`${entry.node_id}::${entry.choice_id}`)
              const text = lookup?.text ?? entry.choice_id
              return (
                <li key={idx}>
                  <button
                    type="button"
                    disabled={!entry.is_dangerous || !scenarioTree}
                    onClick={() =>
                      setFeedbackTarget({
                        choiceId: entry.choice_id,
                        nodeId: entry.node_id,
                        text,
                      })
                    }
                    className={`w-full rounded-md border px-4 py-3 text-left text-sm transition disabled:cursor-default ${
                      entry.is_dangerous
                        ? 'border-red-300/30 bg-red-500/10 text-red-100 hover:border-red-300 disabled:hover:border-red-300/30'
                        : 'border-white/10 bg-slate-900 text-slate-200'
                    }`}
                  >
                    <span className="mr-2 inline-block min-w-[1.5rem] text-emerald-300">
                      {idx + 1}.
                    </span>
                    {text}
                    {entry.is_dangerous ? (
                      <span className="ml-2 text-xs font-semibold text-red-200">
                        위험 선택
                      </span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onSelectOther}
          className="rounded-md border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-emerald-300 hover:text-sos-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
        >
          다른 시나리오 선택
        </button>
        <button
          type="button"
          onClick={onReplay}
          className="rounded-md bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
        >
          다시 플레이
        </button>
      </div>

      {feedbackTarget && feedbackForTarget ? (
        <DangerFeedbackModal
          feedback={feedbackForTarget}
          choiceText={feedbackTarget.text}
          isOpen
          onClose={() => setFeedbackTarget(null)}
        />
      ) : null}
    </section>
  )
}
