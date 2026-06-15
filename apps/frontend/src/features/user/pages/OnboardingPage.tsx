import { useState } from 'react'

import { toApiError } from '@/shared/api/error'

import { useCompleteOnboarding } from '../hooks'
import { useOnboardingDraftStore } from '../store'
import type { OnboardingDraft, OnboardingRequest, Option } from '../types'

type SingleField = 'occupation' | 'ageGroup' | 'gender' | 'familyType'
type MultiField =
  | 'economicActivities'
  | 'communicateChannels'
  | 'onlineActivities'
  | 'financialChannels'

type BaseStep = {
  title: string
  description: string
}

type SingleStep = BaseStep & {
  mode: 'single'
  field: SingleField
  options: Option<string>[]
}

type MultiStep = BaseStep & {
  mode: 'multi'
  field: MultiField
  options: Option<string>[]
  noneValue?: string
}

type OnboardingStep = SingleStep | MultiStep

const occupationOptions = [
  { value: 'STUDENT_K12', label: '초/중/고 학생' },
  { value: 'UNIV_STUDENT', label: '대학(원)생' },
  { value: 'JOB_SEEKER', label: '구직자' },
  { value: 'EMPLOYEE', label: '회사원' },
  { value: 'SELF_EMPLOYED', label: '자영업자' },
  { value: 'FREELANCER', label: '프리랜서' },
  { value: 'OTHER', label: '기타' },
]

const ageGroupOptions = [
  { value: 'TEENS', label: '10대' },
  { value: 'TWENTIES', label: '20대' },
  { value: 'THIRTIES', label: '30대' },
  { value: 'FORTIES', label: '40대' },
  { value: 'FIFTIES', label: '50대' },
  { value: 'SIXTIES_AND_ABOVE', label: '60대 이상' },
]

const genderOptions = [
  { value: 'MALE', label: '남성' },
  { value: 'FEMALE', label: '여성' },
]

const economicActivityOptions = [
  { value: 'ENTERTAINMENT', label: '문화/엔터' },
  { value: 'TRAVEL', label: '여행/레저' },
  { value: 'SUBSCRIPTION', label: '정기 결제/구독' },
  { value: 'EDUCATION', label: '교육/자기계발' },
  { value: 'ONLINE_SHOPPING', label: '온라인 쇼핑/중고거래' },
  { value: 'INVESTMENT', label: '투자/가상화폐/재테크' },
  { value: 'NONE', label: '해당 없음' },
]

const communicateChannelOptions = [
  { value: 'PHONE', label: '전화' },
  { value: 'SMS', label: '문자' },
  { value: 'MESSENGER', label: '카카오톡/메신저' },
  { value: 'SNS', label: 'SNS DM' },
  { value: 'EMAIL', label: '이메일' },
  { value: 'COMMUNITY', label: '온라인 커뮤니티' },
]

const onlineActivityOptions = [
  { value: 'USED_TRADE', label: '중고거래' },
  { value: 'ONLINE_SHOPPING', label: '온라인 쇼핑' },
  { value: 'DELIVERY', label: '택배 수령' },
  { value: 'GOVERNMENT', label: '정부/공공기관 처리' },
  { value: 'OVERSEAS_SHOPPING', label: '해외직구' },
  { value: 'NONE', label: '해당 없음' },
]

const financialChannelOptions = [
  { value: 'MOBILE_BANKING', label: '은행 앱/모바일뱅킹' },
  { value: 'ATM', label: 'ATM 방문' },
  { value: 'INTERNET_BANKING', label: '인터넷뱅킹' },
  { value: 'EASY_PAY', label: '간편결제' },
  { value: 'CRYPTO', label: '가상자산 거래소' },
  { value: 'OVERSEAS_REMIT', label: '해외 송금' },
  { value: 'NONE', label: '해당 없음' },
]

const familyTypeOptions = [
  { value: 'WITH_PARENTS', label: '부모님과 함께' },
  { value: 'WITH_PARTNER', label: '배우자/파트너와 함께' },
  { value: 'WITH_CHILDREN', label: '자녀와 함께' },
  { value: 'ALONE', label: '혼자' },
  { value: 'OTHER', label: '기타' },
]

const onboardingSteps: OnboardingStep[] = [
  {
    mode: 'single',
    field: 'occupation',
    title: '직업',
    description: '직업군에 따라 자주 노출되는 사기 유형이 달라져요.',
    options: occupationOptions,
  },
  {
    mode: 'single',
    field: 'ageGroup',
    title: '연령대',
    description: '연령대별로 익숙한 채널과 위험 신호를 다르게 안내할게요.',
    options: ageGroupOptions,
  },
  {
    mode: 'single',
    field: 'gender',
    title: '성별',
    description: '시나리오 통계와 표현을 더 균형 있게 조정하는 데 사용돼요.',
    options: genderOptions,
  },
  {
    mode: 'multi',
    field: 'economicActivities',
    title: '평소 소비 활동',
    description: '자주 이용하는 소비 영역을 바탕으로 더 현실적인 상황을 추천해요.',
    options: economicActivityOptions,
    noneValue: 'NONE',
  },
  {
    mode: 'multi',
    field: 'communicateChannels',
    title: '자주 사용하는 연락 수단',
    description: '평소 자주 사용하는 연락 수단을 모두 골라주세요.',
    options: communicateChannelOptions,
  },
  {
    mode: 'multi',
    field: 'onlineActivities',
    title: '최근 한 달 내 온라인 활동',
    description: '최근 접점이 있었던 온라인 활동을 기준으로 위험 상황을 맞춤화해요.',
    options: onlineActivityOptions,
    noneValue: 'NONE',
  },
  {
    mode: 'multi',
    field: 'financialChannels',
    title: '평소 금융 거래 방식',
    description: '주로 이용하는 금융 거래 방식을 모두 골라주세요.',
    options: financialChannelOptions,
    noneValue: 'NONE',
  },
  {
    mode: 'single',
    field: 'familyType',
    title: '가족 구성',
    description: '함께 생활하는 가족이 있나요?',
    options: familyTypeOptions,
  },
]

const isSingleStepComplete = (draft: OnboardingDraft, field: SingleField) =>
  Boolean(draft[field])

const isMultiStepComplete = (draft: OnboardingDraft, field: MultiField) =>
  draft[field].length > 0

const createRequest = (draft: OnboardingDraft): OnboardingRequest | null => {
  if (
    !draft.occupation ||
    !draft.ageGroup ||
    !draft.gender ||
    !draft.familyType ||
    draft.economicActivities.length === 0 ||
    draft.communicateChannels.length === 0 ||
    draft.onlineActivities.length === 0 ||
    draft.financialChannels.length === 0
  ) {
    return null
  }

  return {
    occupation: draft.occupation,
    age_group: draft.ageGroup,
    gender: draft.gender,
    economic_activities: draft.economicActivities,
    communicate_channels: draft.communicateChannels,
    online_activities: draft.onlineActivities,
    financial_channels: draft.financialChannels,
    family_type: draft.familyType,
  }
}

const findFirstIncompleteStepIndex = (draft: OnboardingDraft) => {
  const incompleteStepIndex = onboardingSteps.findIndex((step) => {
    if (step.mode === 'single') {
      return !isSingleStepComplete(draft, step.field)
    }

    return !isMultiStepComplete(draft, step.field)
  })

  return incompleteStepIndex === -1 ? onboardingSteps.length - 1 : incompleteStepIndex
}

type OptionGroupProps = {
  step: OnboardingStep
  draft: OnboardingDraft
  onSingleSelect: (field: SingleField, value: string) => void
  onMultiSelect: (field: MultiField, value: string, noneValue?: string) => void
}

function OptionGroup({ step, draft, onSingleSelect, onMultiSelect }: OptionGroupProps) {
  if (step.mode === 'single') {
    const selectedValue = draft[step.field]

    return (
      <div role="radiogroup" aria-labelledby="onboarding-question-title" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {step.options.map((option) => {
          const isSelected = selectedValue === option.value

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSingleSelect(step.field, option.value)}
              className={`min-h-14 rounded-md border px-4 py-3 text-left text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 ${
                isSelected
                  ? 'border-emerald-300 bg-emerald-400 text-slate-950'
                  : 'border-white/10 bg-slate-900 text-slate-200 hover:border-emerald-300'
              }`}
            >
              <span className="flex items-center justify-between gap-3">
                <span>{option.label}</span>
                {isSelected ? <span aria-hidden="true">✓</span> : null}
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  const selectedValues = draft[step.field] as string[]

  return (
    <div role="group" aria-labelledby="onboarding-question-title" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {step.options.map((option) => {
        const isSelected = selectedValues.includes(option.value)

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onMultiSelect(step.field, option.value, step.noneValue)}
            className={`min-h-14 rounded-md border px-4 py-3 text-left text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 ${
              isSelected
                ? 'border-emerald-300 bg-emerald-400 text-slate-950'
                : 'border-white/10 bg-slate-900 text-slate-200 hover:border-emerald-300'
            }`}
          >
            <span className="flex items-center justify-between gap-3">
              <span>{option.label}</span>
              {isSelected ? <span aria-hidden="true">✓</span> : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}

type StepNavigationProps = {
  isFirstStep: boolean
  isLastStep: boolean
  canContinue: boolean
  isSubmitting: boolean
  onPrevious: () => void
  onNext: () => void
}

function StepNavigation({
  isFirstStep,
  isLastStep,
  canContinue,
  isSubmitting,
  onPrevious,
  onNext,
}: StepNavigationProps) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
      <button
        type="button"
        disabled={isFirstStep || isSubmitting}
        onClick={onPrevious}
        className="rounded-md border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-emerald-300 hover:text-white disabled:cursor-not-allowed disabled:border-white/5 disabled:text-slate-600"
      >
        이전
      </button>
      <button
        type="button"
        disabled={!canContinue || isSubmitting}
        onClick={onNext}
        className="rounded-md bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >
        {isSubmitting ? '저장 중...' : isLastStep ? '완료' : '다음'}
      </button>
    </div>
  )
}

export function OnboardingPage() {
  const draft = useOnboardingDraftStore((state) => state.onboardingDraft)
  const setOnboardingDraft = useOnboardingDraftStore((state) => state.setOnboardingDraft)
  const completeOnboardingMutation = useCompleteOnboarding()
  const [visibleStepIndex, setVisibleStepIndex] = useState(() =>
    findFirstIncompleteStepIndex(draft),
  )
  const step = onboardingSteps[visibleStepIndex]
  const isFirstStep = visibleStepIndex === 0
  const isLastStep = visibleStepIndex === onboardingSteps.length - 1
  const progressPercent = Math.round(((visibleStepIndex + 1) / onboardingSteps.length) * 100)
  const canContinue =
    step.mode === 'single'
      ? isSingleStepComplete(draft, step.field)
      : isMultiStepComplete(draft, step.field)
  const errorMessage = completeOnboardingMutation.error
    ? toApiError(completeOnboardingMutation.error).message
    : null

  const handleSingleSelect = (field: SingleField, value: string) => {
    setOnboardingDraft({ [field]: value } as Partial<OnboardingDraft>)
  }

  const handleMultiSelect = (field: MultiField, value: string, noneValue?: string) => {
    const selectedValues = draft[field] as string[]

    if (value === noneValue) {
      setOnboardingDraft({
        [field]: selectedValues.includes(value) ? [] : [value],
      } as Partial<OnboardingDraft>)
      return
    }

    const nextValues = selectedValues.includes(value)
      ? selectedValues.filter((selectedValue) => selectedValue !== value)
      : [...selectedValues.filter((selectedValue) => selectedValue !== noneValue), value]

    setOnboardingDraft({ [field]: nextValues } as Partial<OnboardingDraft>)
  }

  const handlePrevious = () => {
    if (!isFirstStep) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setVisibleStepIndex((stepIndex) => stepIndex - 1)
    }
  }

  const handleNext = () => {
    if (!canContinue) {
      return
    }

    if (!isLastStep) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setVisibleStepIndex((stepIndex) => stepIndex + 1)
      return
    }

    const request = createRequest(draft)

    if (request) {
      completeOnboardingMutation.mutate(request)
    }
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6 py-6 sm:py-10">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-emerald-300">Safe or Scam 프로필 설정</p>
        <p className="text-3xl font-semibold text-white">맞춤 피싱 훈련을 준비해볼게요</p>
        <p className="text-slate-300">
          몇 가지 생활 패턴을 알려주시면 더 현실적인 시나리오를 추천합니다.
        </p>
      </div>

      <div className="rounded-xl border border-white/8 bg-sos-surface-1 p-5 shadow-sos-raised sm:p-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-slate-300">
            <span>
              {visibleStepIndex + 1} / {onboardingSteps.length}
            </span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800" aria-hidden="true">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="mt-8 space-y-7">
          <div className="space-y-2">
            <h1
              id="onboarding-question-title"
              tabIndex={0}
              className="text-2xl font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
            >
              {step.title}
            </h1>
            <p className="text-sm leading-6 text-slate-300">{step.description}</p>
          </div>

          <OptionGroup
            step={step}
            draft={draft}
            onSingleSelect={handleSingleSelect}
            onMultiSelect={handleMultiSelect}
          />

          {errorMessage ? (
            <p role="alert" className="rounded-md border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
              {errorMessage}
            </p>
          ) : null}

          <StepNavigation
            isFirstStep={isFirstStep}
            isLastStep={isLastStep}
            canContinue={canContinue}
            isSubmitting={completeOnboardingMutation.isPending}
            onPrevious={handlePrevious}
            onNext={handleNext}
          />
        </div>
      </div>
    </section>
  )
}
