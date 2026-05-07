import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'

import { toApiError } from '@/shared/api/error'

import { useUpdateProfile, useUserProfile, useWithdrawUser } from '../hooks'
import type {
  AgeGroup,
  Gender,
  Occupation,
  Option,
  UpdateProfileRequest,
  UserProfile,
} from '../types'

type ProfileForm = {
  occupation: Occupation | ''
  ageGroup: AgeGroup | ''
  gender: Gender | ''
}

type ToastState = {
  tone: 'success' | 'error'
  message: string
} | null

type ProfileTab = 'history' | 'achievements'

const occupationOptions: Option<Occupation>[] = [
  { value: 'STUDENT_K12', label: '초/중/고 학생' },
  { value: 'UNIV_STUDENT', label: '대학(원)생' },
  { value: 'JOB_SEEKER', label: '구직자' },
  { value: 'EMPLOYEE', label: '회사원' },
  { value: 'SELF_EMPLOYED', label: '자영업자' },
  { value: 'FREELANCER', label: '프리랜서' },
  { value: 'HOMEMAKER', label: '전업주부/주부' },
  { value: 'UNEMPLOYED', label: '무직' },
  { value: 'OTHER', label: '기타' },
]

const ageGroupOptions: Option<AgeGroup>[] = [
  { value: 'TEENS', label: '10대' },
  { value: 'TWENTIES', label: '20대' },
  { value: 'THIRTIES', label: '30대' },
  { value: 'FORTIES', label: '40대' },
  { value: 'FIFTIES', label: '50대' },
  { value: 'SIXTIES_AND_ABOVE', label: '60대 이상' },
]

const genderOptions: Option<Gender>[] = [
  { value: 'FEMALE', label: '여성' },
  { value: 'MALE', label: '남성' },
]

const scenarioHistory = [
  {
    title: '택배 배송 주소 확인',
    lastPlayedAt: '2026.05.06',
    result: '안전 대응',
    endingsCollected: 2,
    endingsTotal: 4,
  },
  {
    title: '회사 보안 메일 점검',
    lastPlayedAt: '2026.05.04',
    result: '위험 링크 차단',
    endingsCollected: 1,
    endingsTotal: 3,
  },
  {
    title: '계좌 이상 거래 알림',
    lastPlayedAt: '2026.05.01',
    result: '추가 확인 필요',
    endingsCollected: 3,
    endingsTotal: 5,
  },
]

const achievements = [
  { title: '첫 판별 완료', description: '첫 시나리오를 끝까지 플레이하면 열립니다.' },
  { title: '위험 링크 차단', description: '링크형 피싱을 안전하게 판별하면 열립니다.' },
  { title: '침착한 확인', description: '추가 확인 선택지를 고르면 열립니다.' },
]

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

const createEmptyForm = (): ProfileForm => ({
  occupation: '',
  ageGroup: '',
  gender: '',
})

const createFormFromProfile = (profile: UserProfile): ProfileForm => ({
  occupation: profile.occupation ?? '',
  ageGroup: profile.ageGroup ?? '',
  gender: profile.gender ?? '',
})

const getOptionLabel = <Value extends string>(options: Option<Value>[], value: Value | null) =>
  options.find((option) => option.value === value)?.label ?? '선택되지 않음'

const createProfileUpdate = (form: ProfileForm): UpdateProfileRequest | null => {
  if (!form.occupation || !form.ageGroup || !form.gender) {
    return null
  }

  return {
    occupation: form.occupation,
    ageGroup: form.ageGroup,
    gender: form.gender,
  }
}

const hasProfileChanges = (profile: UserProfile, form: ProfileForm) =>
  form.occupation !== profile.occupation ||
  form.ageGroup !== profile.ageGroup ||
  form.gender !== profile.gender

function ProfileSkeleton() {
  return (
    <div className="space-y-5 rounded-lg border border-white/10 bg-white/3 p-6">
      <div className="flex items-center gap-4">
        <div className="size-16 animate-pulse rounded-full bg-slate-800" />
        <div className="space-y-3">
          <div className="h-5 w-28 animate-pulse rounded bg-slate-800" />
          <div className="h-4 w-44 animate-pulse rounded bg-slate-800" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-20 animate-pulse rounded-md bg-slate-800" />
        <div className="h-20 animate-pulse rounded-md bg-slate-800" />
        <div className="h-20 animate-pulse rounded-md bg-slate-800" />
      </div>
    </div>
  )
}

type WithdrawDialogProps = {
  isSubmitting: boolean
  onCancel: () => void
  onConfirm: () => void
}

function WithdrawDialog({ isSubmitting, onCancel, onConfirm }: WithdrawDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null
    cancelButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancel()
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const dialog = dialogRef.current
      const focusableElements = Array.from(
        dialog?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
      ).filter((element) => !element.hasAttribute('disabled') && !element.getAttribute('aria-hidden'))

      if (!dialog || focusableElements.length === 0) {
        event.preventDefault()
        dialog?.focus()
        return
      }

      const firstFocusableElement = focusableElements[0]
      const lastFocusableElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && document.activeElement === firstFocusableElement) {
        event.preventDefault()
        lastFocusableElement.focus()
        return
      }

      if (!event.shiftKey && document.activeElement === lastFocusableElement) {
        event.preventDefault()
        firstFocusableElement.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      previouslyFocusedElementRef.current?.focus()
    }
  }, [onCancel])

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/80 px-5 py-8"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="withdraw-title"
        aria-describedby="withdraw-description"
        tabIndex={-1}
        className="w-full max-w-md rounded-lg border border-red-300/30 bg-slate-900 p-6 shadow-2xl shadow-slate-950/50"
      >
        <p className="text-sm font-semibold text-red-200">계정 삭제</p>
        <h2 id="withdraw-title" className="mt-3 text-2xl font-semibold text-white">
          정말 탈퇴하시겠어요?
        </h2>
        <div id="withdraw-description" className="mt-3 space-y-3 text-sm leading-6 text-slate-300">
          <p className="rounded-md border border-red-300/25 bg-red-500/10 px-3 py-2 font-semibold text-red-100">
            복구할 수 없습니다.
          </p>
          <p>
            탈퇴하면 계정과 활동 기록이 영구 삭제됩니다. 14일 동안 같은 이메일로
            재가입할 수 있지만, 기존 데이터는 되돌릴 수 없습니다.
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
            className="rounded-md border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-emerald-300 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 disabled:cursor-not-allowed disabled:text-slate-500"
          >
            취소
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className="rounded-md bg-red-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-red-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {isSubmitting ? '탈퇴 처리 중...' : '탈퇴하기'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function MyPage() {
  const profileQuery = useUserProfile()
  const updateProfileMutation = useUpdateProfile()
  const withdrawUserMutation = useWithdrawUser()
  const [form, setForm] = useState<ProfileForm>(createEmptyForm)
  const [isEditing, setIsEditing] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [activeTab, setActiveTab] = useState<ProfileTab>('history')
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false)

  const profile = profileQuery.data
  const currentForm = isEditing || !profile ? form : createFormFromProfile(profile)
  const profileUpdate = createProfileUpdate(currentForm)
  const isDirty = profile ? hasProfileChanges(profile, currentForm) : false
  const isSavingDisabled = !isEditing || !profileUpdate || updateProfileMutation.isPending

  useEffect(() => {
    if (!toast) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setToast(null)
    }, 2000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [toast])

  const handleFieldChange =
    (field: keyof ProfileForm) => (event: ChangeEvent<HTMLSelectElement>) => {
      setForm((currentForm) => ({
        ...currentForm,
        [field]: event.target.value,
      }))
    }

  const handleCancelEdit = () => {
    if (profile) {
      setForm(createFormFromProfile(profile))
    }
    setIsEditing(false)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!profileUpdate) {
      setToast({ tone: 'error', message: '직업, 연령대, 성별을 모두 선택해주세요.' })
      return
    }

    updateProfileMutation.mutate(profileUpdate, {
      onSuccess: () => {
        setIsEditing(false)
        setToast({ tone: 'success', message: '저장되었어요.' })
      },
      onError: () => {
        setToast({ tone: 'error', message: '회원 정보를 저장하지 못했어요. 다시 시도해주세요.' })
      },
    })
  }

  const handleWithdraw = () => {
    withdrawUserMutation.mutate(undefined, {
      onError: (error) => {
        setToast({ tone: 'error', message: toApiError(error).message })
      },
    })
  }

  if (profileQuery.isPending) {
    return (
      <section className="mx-auto max-w-4xl space-y-6 py-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">마이페이지</h1>
          <p className="text-slate-300">내 계정과 맞춤 훈련 설정을 확인합니다.</p>
        </div>
        <ProfileSkeleton />
      </section>
    )
  }

  if (profileQuery.isError) {
    return (
      <section className="mx-auto max-w-2xl space-y-6 py-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">마이페이지</h1>
          <p className="text-slate-300">프로필 정보를 불러오지 못했습니다.</p>
        </div>
        <div className="rounded-lg border border-red-300/25 bg-red-500/10 p-6">
          <p className="text-sm text-red-100">{toApiError(profileQuery.error).message}</p>
          <button
            type="button"
            onClick={() => void profileQuery.refetch()}
            className="mt-4 rounded-md bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
          >
            다시 시도
          </button>
        </div>
      </section>
    )
  }

  if (!profile) {
    return null
  }

  return (
    <section className="mx-auto max-w-4xl space-y-6 py-10">
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className={`fixed right-5 top-20 z-40 rounded-md border px-4 py-3 text-sm font-semibold shadow-lg shadow-slate-950/30 ${
            toast.tone === 'success'
              ? 'border-emerald-300/30 bg-emerald-400 text-slate-950'
              : 'border-red-300/30 bg-red-500 text-white'
          }`}
        >
          {toast.message}
        </div>
      ) : null}

      {isWithdrawDialogOpen ? (
        <WithdrawDialog
          isSubmitting={withdrawUserMutation.isPending}
          onCancel={() => {
            if (!withdrawUserMutation.isPending) {
              setIsWithdrawDialogOpen(false)
            }
          }}
          onConfirm={handleWithdraw}
        />
      ) : null}

      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">마이페이지</h1>
        <p className="text-slate-300">내 계정과 맞춤 훈련 설정을 확인합니다.</p>
      </div>

      <section className="rounded-lg border border-white/10 bg-white/3 p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-full border border-emerald-300/40 bg-emerald-300/10 text-2xl font-semibold text-emerald-200">
              {profile.name.trim().slice(0, 1) || 'S'}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">{profile.name}</h2>
              <p className="mt-1 text-sm text-slate-400">{profile.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setForm(createFormFromProfile(profile))
              setIsEditing(true)
            }}
            disabled={isEditing}
            className="w-full rounded-md border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-emerald-300 hover:text-white disabled:cursor-not-allowed disabled:border-white/5 disabled:text-slate-600 sm:w-auto"
          >
            수정하기
          </button>
        </div>
      </section>

      <form className="space-y-5 rounded-lg border border-white/10 bg-white/3 p-6" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">회원 정보</h2>
            <p className="mt-1 text-sm text-slate-400">이름과 이메일은 현재 수정할 수 없습니다.</p>
          </div>
          {isDirty ? (
            <span className="w-fit rounded-md bg-emerald-300/10 px-2 py-1 text-xs font-medium text-emerald-200">
              변경사항 있음
            </span>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-md border border-white/10 bg-slate-900 px-3 py-3">
            <p className="text-sm font-medium text-slate-400">이름</p>
            <p className="mt-1 font-semibold text-white">{profile.name}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-slate-900 px-3 py-3">
            <p className="text-sm font-medium text-slate-400">이메일</p>
            <p className="mt-1 break-all font-semibold text-white">{profile.email}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-200">직업</span>
            <select
              value={currentForm.occupation}
              disabled={!isEditing || updateProfileMutation.isPending}
              onChange={handleFieldChange('occupation')}
              className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none focus:border-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-500"
            >
              <option value="">{getOptionLabel(occupationOptions, null)}</option>
              {occupationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-200">연령대</span>
            <select
              value={currentForm.ageGroup}
              disabled={!isEditing || updateProfileMutation.isPending}
              onChange={handleFieldChange('ageGroup')}
              className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none focus:border-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-500"
            >
              <option value="">{getOptionLabel(ageGroupOptions, null)}</option>
              {ageGroupOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-200">성별</span>
            <select
              value={currentForm.gender}
              disabled={!isEditing || updateProfileMutation.isPending}
              onChange={handleFieldChange('gender')}
              className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none focus:border-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-500"
            >
              <option value="">{getOptionLabel(genderOptions, null)}</option>
              {genderOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {isEditing ? (
            <button
              type="button"
              disabled={updateProfileMutation.isPending}
              onClick={handleCancelEdit}
              className="rounded-md border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-emerald-300 hover:text-white disabled:cursor-not-allowed disabled:text-slate-500"
            >
              취소
            </button>
          ) : null}
          <button
            type="submit"
            disabled={isSavingDisabled}
            className="rounded-md bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {updateProfileMutation.isPending ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>

      <section className="space-y-4 rounded-lg border border-white/10 bg-white/3 p-6">
        <div className="flex gap-2 border-b border-white/10 pb-3" role="tablist" aria-label="마이페이지 탭">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'history'}
            onClick={() => setActiveTab('history')}
            className={`rounded-md px-3 py-2 text-sm font-semibold ${
              activeTab === 'history'
                ? 'bg-emerald-400 text-slate-950'
                : 'bg-slate-900 text-slate-300 hover:text-white'
            }`}
          >
            히스토리
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'achievements'}
            onClick={() => setActiveTab('achievements')}
            className={`rounded-md px-3 py-2 text-sm font-semibold ${
              activeTab === 'achievements'
                ? 'bg-emerald-400 text-slate-950'
                : 'bg-slate-900 text-slate-300 hover:text-white'
            }`}
          >
            업적
          </button>
        </div>

        {activeTab === 'history' ? (
          <div role="tabpanel" className="space-y-3">
            {scenarioHistory.map((scenario) => {
              const collectionRate = Math.round(
                (scenario.endingsCollected / scenario.endingsTotal) * 100,
              )

              return (
                <article
                  key={scenario.title}
                  aria-disabled="true"
                  className="relative rounded-md border border-white/10 bg-slate-900 p-4 opacity-65"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-white">{scenario.title}</h3>
                      <p className="mt-1 text-sm text-slate-400">
                        최근 플레이 {scenario.lastPlayedAt} · {scenario.result}
                      </p>
                    </div>
                    <span className="w-fit rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-slate-300">
                      Coming soon
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>결말 수집도</span>
                      <span>{collectionRate}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-slate-600"
                        style={{ width: `${collectionRate}%` }}
                      />
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div role="tabpanel" className="grid gap-3 md:grid-cols-3">
            {achievements.map((achievement) => (
              <article
                key={achievement.title}
                aria-disabled="true"
                className="rounded-md border border-dashed border-white/15 bg-slate-900 p-4 opacity-65"
              >
                <span className="rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-slate-300">
                  Coming soon
                </span>
                <h3 className="mt-4 font-semibold text-white">{achievement.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{achievement.description}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-red-300/30 bg-red-500/8 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-red-100">계정 삭제</h2>
            <p className="mt-2 text-sm leading-6 text-red-100/80">
              탈퇴하면 계정과 활동 기록이 영구 삭제되며 복구할 수 없습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsWithdrawDialogOpen(true)}
            className="rounded-md bg-red-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-red-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
          >
            회원 탈퇴
          </button>
        </div>
      </section>
    </section>
  )
}
