import { create } from 'zustand'

import type { OnboardingDraft } from './types'

const createEmptyOnboardingDraft = (): OnboardingDraft => ({
  occupation: null,
  ageGroup: null,
  gender: null,
  economicActivities: [],
  communicateChannels: [],
  onlineActivities: [],
  financialChannels: [],
  familyType: null,
})

type OnboardingDraftState = {
  onboardingDraft: OnboardingDraft
  setOnboardingDraft: (draft: Partial<OnboardingDraft>) => void
  clearOnboardingDraft: () => void
}

export const useOnboardingDraftStore = create<OnboardingDraftState>((set) => ({
  onboardingDraft: createEmptyOnboardingDraft(),
  setOnboardingDraft: (draft) => {
    set((state) => ({
      onboardingDraft: {
        ...state.onboardingDraft,
        ...draft,
      },
    }))
  },
  clearOnboardingDraft: () => {
    set({ onboardingDraft: createEmptyOnboardingDraft() })
  },
}))
