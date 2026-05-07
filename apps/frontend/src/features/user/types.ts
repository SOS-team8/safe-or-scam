import type { UserRole } from '@/features/auth/types'

export type Occupation =
  | 'STUDENT_K12'
  | 'UNIV_STUDENT'
  | 'JOB_SEEKER'
  | 'EMPLOYEE'
  | 'SELF_EMPLOYED'
  | 'FREELANCER'
  | 'HOMEMAKER'
  | 'UNEMPLOYED'
  | 'OTHER'

export type AgeGroup =
  | 'TEENS'
  | 'TWENTIES'
  | 'THIRTIES'
  | 'FORTIES'
  | 'FIFTIES'
  | 'SIXTIES_AND_ABOVE'

export type Gender = 'MALE' | 'FEMALE'

export type EconomicActivity =
  | 'ENTERTAINMENT'
  | 'TRAVEL'
  | 'SUBSCRIPTION'
  | 'EDUCATION'
  | 'ONLINE_SHOPPING'
  | 'INVESTMENT'
  | 'NONE'

export type CommunicateChannel =
  | 'PHONE'
  | 'SMS'
  | 'MESSENGER'
  | 'SNS'
  | 'EMAIL'
  | 'COMMUNITY'

export type OnlineActivity =
  | 'USED_TRADE'
  | 'ONLINE_SHOPPING'
  | 'DELIVERY'
  | 'GOVERNMENT'
  | 'OVERSEAS_SHOPPING'
  | 'NONE'

export type FinancialChannel =
  | 'MOBILE_BANKING'
  | 'ATM'
  | 'INTERNET_BANKING'
  | 'EASY_PAY'
  | 'CRYPTO'
  | 'OVERSEAS_REMIT'
  | 'NONE'

export type FamilyType =
  | 'WITH_PARENTS'
  | 'WITH_PARTNER'
  | 'WITH_CHILDREN'
  | 'ALONE'
  | 'OTHER'

export type OnboardingDraft = {
  occupation: Occupation | null
  ageGroup: AgeGroup | null
  gender: Gender | null
  economicActivities: EconomicActivity[]
  communicateChannels: CommunicateChannel[]
  onlineActivities: OnlineActivity[]
  financialChannels: FinancialChannel[]
  familyType: FamilyType | null
}

export type OnboardingRequest = {
  occupation: Occupation
  ageGroup: AgeGroup
  age_group: AgeGroup
  gender: Gender
  economicActivities: EconomicActivity[]
  economic_activities: EconomicActivity[]
  communicateChannels: CommunicateChannel[]
  communicate_channels: CommunicateChannel[]
  onlineActivities: OnlineActivity[]
  online_activities: OnlineActivity[]
  financialChannels: FinancialChannel[]
  financial_channels: FinancialChannel[]
  familyType: FamilyType
  family_type: FamilyType
}

export type OnboardingResponse = {
  message: string
  accessToken: string
  refreshToken: string
  role: UserRole
}

export type UserProfile = {
  name: string
  email: string
  occupation: Occupation | null
  gender: Gender | null
  ageGroup: AgeGroup | null
}

export type UpdateProfileRequest = {
  occupation: Occupation
  gender: Gender
  ageGroup: AgeGroup
}

export type UpdateProfileResponse = {
  message: string
}

export type WithdrawalResponse = {
  message: string
  scheduledAt: string
  status: string
}

export type Option<Value extends string> = {
  value: Value
  label: string
}
