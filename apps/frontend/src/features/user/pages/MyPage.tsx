import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import sosMascot from '@/assets/sos-mascot.svg'
import { AchievementsTab } from '@/features/achievement/components/AchievementsTab'
import { useLogout } from '@/features/auth/hooks'
import { HistoryTab } from '@/features/history/components/HistoryTab'
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

type ProfileTab = 'profile' | 'history' | 'stats' | 'achievements'

const profileTabs: Array<{ value: ProfileTab; label: string }> = [
  { value: 'profile', label: '회원 정보' },
  { value: 'history', label: '히스토리' },
  { value: 'stats', label: '통계' },
  { value: 'achievements', label: '업적' },
]

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
    <div className="space-y-5 rounded-xl border border-white/8 bg-sos-surface-2 p-6 shadow-sos-raised">
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
      ).filter((element) => element.getAttribute('aria-hidden') !== 'true')

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
        className="w-full max-w-md rounded-xl border border-red-300/30 bg-slate-900 p-6 shadow-sos-dialog"
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
            className="rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-emerald-300 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 disabled:cursor-not-allowed disabled:text-slate-500"
          >
            취소
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className="rounded-lg bg-red-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-red-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {isSubmitting ? '탈퇴 처리 중...' : '탈퇴하기'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function MyPage() {
  const navigate = useNavigate()
  const profileQuery = useUserProfile()
  const updateProfileMutation = useUpdateProfile()
  const withdrawUserMutation = useWithdrawUser()
  const logoutMutation = useLogout()
  const [form, setForm] = useState<ProfileForm>(createEmptyForm)
  const [isEditing, setIsEditing] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile')
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false)
  const [pendingAchievementId, setPendingAchievementId] = useState<number | null>(null)
  const location = useLocation()
  const [handledFocusState, setHandledFocusState] = useState<unknown>(null)

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

  // 네비바 알림(NotificationBell)에서 업적 알림 클릭 시 업적 탭으로 진입
  const focusState = location.state as { focusAchievementId?: number | null } | null
  const hasFocusRequest = Boolean(focusState && 'focusAchievementId' in focusState)

  if (hasFocusRequest && focusState !== handledFocusState) {
    setHandledFocusState(focusState)
    setActiveTab('achievements')
    setPendingAchievementId(focusState?.focusAchievementId ?? null)
  }

  useEffect(() => {
    if (hasFocusRequest) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [hasFocusRequest, location.pathname, navigate])

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
      <section className="mx-auto max-w-4xl space-y-8 py-12">
        <div className="space-y-2">
          <p className="text-sm font-medium text-emerald-300">내 계정</p>
          <h1 className="text-3xl font-bold tracking-tight text-white">마이페이지</h1>
          <p className="text-slate-300">내 계정과 맞춤 훈련 설정을 확인합니다.</p>
        </div>
        <ProfileSkeleton />
      </section>
    )
  }

  if (profileQuery.isError) {
    return (
      <section className="mx-auto max-w-2xl space-y-8 py-12">
        <div className="space-y-2">
          <p className="text-sm font-medium text-emerald-300">내 계정</p>
          <h1 className="text-3xl font-bold tracking-tight text-white">마이페이지</h1>
          <p className="text-slate-300">프로필 정보를 불러오지 못했습니다.</p>
        </div>
        <div className="rounded-lg border border-red-300/25 bg-red-500/10 p-6">
          <p className="text-sm text-red-100">{toApiError(profileQuery.error).message}</p>
          <button
            type="button"
            onClick={() => void profileQuery.refetch()}
            className="mt-4 rounded-lg bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
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
    <section className="mx-auto max-w-5xl space-y-8 py-12">
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className={`fixed right-5 top-20 z-40 rounded-lg border px-4 py-3 text-sm font-semibold shadow-lg shadow-slate-950/30 ${
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
        <p className="text-sm font-medium text-emerald-300">내 계정</p>
        <h1 className="text-3xl font-bold tracking-tight text-white">마이페이지</h1>
        <p className="text-slate-300">내 계정과 맞춤 훈련 설정을 확인합니다.</p>
      </div>

      <div className="md:grid md:grid-cols-[200px_minmax(0,1fr)] md:items-start md:gap-6">
        <nav
          role="tablist"
          aria-label="마이페이지 메뉴"
          aria-orientation="vertical"
          className="mb-6 flex gap-1.5 overflow-x-auto rounded-xl border border-white/8 bg-sos-surface-1 p-2 shadow-sos-raised md:sticky md:top-24 md:mb-0 md:flex-col md:overflow-visible"
        >
          {profileTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`shrink-0 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 md:w-full md:text-left ${
                activeTab === tab.value
                  ? 'bg-emerald-300/10 text-emerald-200'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="space-y-6">
          {activeTab === 'profile' ? (
            <div role="tabpanel" className="space-y-6">
      <section className="rounded-xl border border-white/8 bg-sos-surface-2 p-5 shadow-sos-raised sm:p-6">
        <div className="flex items-center gap-6">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-full border border-emerald-300/40 bg-emerald-300/10">
            <img
              src={sosMascot}
              alt=""
              aria-hidden="true"
              className="absolute left-1/2 top-1.5 w-[140%] max-w-none -translate-x-1/2"
            />
          </div>
          <div className="pl-1">
            <h2 className="text-2xl font-semibold tracking-[-0.01em] text-white">{profile.name}</h2>
            <p className="mt-1.5 text-base text-slate-400">{profile.email}</p>
          </div>
        </div>
      </section>

      <form
        className="space-y-4 rounded-xl border border-white/8 bg-sos-surface-2 p-5 shadow-sos-raised sm:p-6"
        onSubmit={handleSubmit}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.01em] text-white">회원 정보</h2>
            <p className="mt-1 text-sm text-slate-400">이름과 이메일은 현재 수정할 수 없습니다.</p>
          </div>
          {isDirty ? (
            <span className="w-fit rounded-md bg-emerald-300/10 px-2 py-1 text-xs font-medium text-emerald-200">
              변경사항 있음
            </span>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-white/8 bg-sos-inset px-4 py-3">
            <p className="text-[13px] font-medium text-slate-400">이름</p>
            <p className="mt-1 text-[15px] text-slate-300">{profile.name}</p>
          </div>
          <div className="rounded-lg border border-white/8 bg-sos-inset px-4 py-3">
            <p className="text-[13px] font-medium text-slate-400">이메일</p>
            <p className="mt-1 break-all text-[15px] text-slate-300">{profile.email}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="block space-y-2">
            <span className="text-[13px] font-medium text-slate-400">직업</span>
            <select
              value={currentForm.occupation}
              disabled={!isEditing || updateProfileMutation.isPending}
              onChange={handleFieldChange('occupation')}
              className="w-full rounded-lg border border-white/8 bg-sos-inset px-4 py-3 text-[15px] text-white outline-none focus:border-emerald-300 focus-visible:ring-2 focus-visible:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-500"
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
            <span className="text-[13px] font-medium text-slate-400">연령대</span>
            <select
              value={currentForm.ageGroup}
              disabled={!isEditing || updateProfileMutation.isPending}
              onChange={handleFieldChange('ageGroup')}
              className="w-full rounded-lg border border-white/8 bg-sos-inset px-4 py-3 text-[15px] text-white outline-none focus:border-emerald-300 focus-visible:ring-2 focus-visible:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-500"
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
            <span className="text-[13px] font-medium text-slate-400">성별</span>
            <select
              value={currentForm.gender}
              disabled={!isEditing || updateProfileMutation.isPending}
              onChange={handleFieldChange('gender')}
              className="w-full rounded-lg border border-white/8 bg-sos-inset px-4 py-3 text-[15px] text-white outline-none focus:border-emerald-300 focus-visible:ring-2 focus-visible:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-950 disabled:text-slate-500"
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
            <>
              <button
                type="button"
                disabled={updateProfileMutation.isPending}
                onClick={handleCancelEdit}
                className="rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-emerald-300 hover:text-white disabled:cursor-not-allowed disabled:text-slate-500"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSavingDisabled}
                className="rounded-lg bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                {updateProfileMutation.isPending ? '저장 중...' : '저장'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setForm(createFormFromProfile(profile))
                setIsEditing(true)
              }}
              className="rounded-lg bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
            >
              수정하기
            </button>
          )}
        </div>
      </form>

              <section className="rounded-xl border border-white/8 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-white">로그아웃</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      현재 기기에서 로그아웃합니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={logoutMutation.isPending}
                    onClick={() => logoutMutation.mutate()}
                    className="rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-emerald-300 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 disabled:cursor-not-allowed disabled:text-slate-500"
                  >
                    {logoutMutation.isPending ? '로그아웃 중...' : '로그아웃'}
                  </button>
                </div>
              </section>

              <section className="rounded-xl border border-red-300/20 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-red-200">계정 삭제</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      탈퇴하면 계정과 활동 기록이 영구 삭제되며 복구할 수 없습니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsWithdrawDialogOpen(true)}
                    className="rounded-lg bg-red-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-red-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
                  >
                    회원 탈퇴
                  </button>
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === 'history' ? (
            <section
              role="tabpanel"
              className="space-y-4 rounded-xl border border-white/8 bg-sos-surface-1 p-5 shadow-sos-raised sm:p-6"
            >
              <h2 className="text-xl font-semibold tracking-[-0.01em] text-white">히스토리</h2>
              <HistoryTab />
            </section>
          ) : null}

          {activeTab === 'stats' ? (
            <section
              role="tabpanel"
              className="space-y-4 rounded-xl border border-white/8 bg-sos-surface-1 p-5 shadow-sos-raised sm:p-6"
            >
              <h2 className="text-xl font-semibold tracking-[-0.01em] text-white">통계</h2>
              {/* TODO(BE): 사용자 통계 공개 API 추가 시 연동 (user_stats: 완료 플레이/안전 결말/평균 점수 등) */}
              <div className="rounded-lg border border-white/8 bg-sos-inset p-6 text-center">
                <p className="text-sm font-medium text-slate-300">통계는 준비 중이에요.</p>
                <p className="mt-1 text-sm text-slate-500">
                  완료한 플레이, 안전 결말 횟수, 평균 점수 같은 훈련 통계가 여기에 표시될 예정입니다.
                </p>
              </div>
            </section>
          ) : null}

          {activeTab === 'achievements' ? (
            <section
              role="tabpanel"
              className="space-y-4 rounded-xl border border-white/8 bg-sos-surface-1 p-5 shadow-sos-raised sm:p-6"
            >
              <h2 className="text-xl font-semibold tracking-[-0.01em] text-white">업적</h2>
              <AchievementsTab
                focusAchievementId={pendingAchievementId}
                onFocusHandled={() => setPendingAchievementId(null)}
              />
            </section>
          ) : null}
        </div>
      </div>
    </section>
  )
}
