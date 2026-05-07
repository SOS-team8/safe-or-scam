import { create } from 'zustand'

import type { OnboardingDraft } from './types'

export const emptyOnboardingDraft: OnboardingDraft = {
  occupation: null,
  ageGroup: null,
  gender: null,
  economicActivities: [],
  communicateChannels: [],
  onlineActivities: [],
  financialChannels: [],
  familyType: null,
}

type OnboardingDraftState = {
  onboardingDraft: OnboardingDraft
  setOnboardingDraft: (draft: Partial<OnboardingDraft>) => void
  clearOnboardingDraft: () => void
}

export const useOnboardingDraftStore = create<OnboardingDraftState>((set) => ({
  onboardingDraft: emptyOnboardingDraft,
  setOnboardingDraft: (draft) => {
    set((state) => ({
      onboardingDraft: {
        ...state.onboardingDraft,
        ...draft,
      },
    }))
  },
  clearOnboardingDraft: () => {
    set({ onboardingDraft: emptyOnboardingDraft })
  },
}))
