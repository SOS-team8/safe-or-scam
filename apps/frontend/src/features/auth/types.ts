export type VerificationPurpose = 'SIGNUP' | 'RESET_PASSWORD'

export type UserRole = 'GUEST' | 'USER' | 'ADMIN'

export type LoginRequest = {
  email: string
  password: string
}

export type EmailSendRequest = {
  email: string
  purpose: VerificationPurpose
}

export type EmailVerifyRequest = {
  email: string
  code: string
  purpose: VerificationPurpose
}

export type SignupRequest = {
  verificationToken: string
  password: string
  name: string
}

export type LogoutRequest = {
  refreshToken: string
}

export type LoginResponse = {
  accessToken: string
  refreshToken: string
  user: {
    id: number
    email: string
    name: string
    role: UserRole
  }
}

export type SignupResponse = {
  accessToken: string
  refreshToken: string
  user: {
    userId: number
    email: string
    name: string
    role: UserRole
  }
}

export type EmailVerifyResponse = {
  verificationToken: string
}

export type MeResponse = {
  name: string
  email: string
  occupation: string | null
  gender: string | null
  ageGroup: string | null
}

export type ApiResponse<T> = {
  data: T
  error?: {
    code: string
    message: string
    fieldInfo?: {
      field: string
      message: string
    }[]
  } | null
  meta: {
    timestamp: string
  }
}

export type SignupDraft = {
  email: string
  name: string
  password: string
}
