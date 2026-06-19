import { z } from 'zod'

const EMAIL_REQUIRED_MESSAGE = '이메일을 입력해주세요'
const EMAIL_INVALID_MESSAGE = '이메일 형식이 올바르지 않습니다'
const PASSWORD_REQUIRED_MESSAGE = '비밀번호를 입력해주세요'

const passwordByteLength = (password: string) => new TextEncoder().encode(password).length

export const loginSchema = z.object({
  email: z.string().trim().min(1, EMAIL_REQUIRED_MESSAGE).email(EMAIL_INVALID_MESSAGE),
  password: z.string().min(1, PASSWORD_REQUIRED_MESSAGE),
})

export const signupSchema = z.object({
  name: z.string().trim().min(1, '이름을 입력해주세요'),
  email: z.string().trim().min(1, EMAIL_REQUIRED_MESSAGE).email(EMAIL_INVALID_MESSAGE),
  password: z
    .string()
    .min(1, PASSWORD_REQUIRED_MESSAGE)
    .min(10, '비밀번호는 10자 이상이어야 합니다')
    .refine((password) => passwordByteLength(password) <= 72, {
      message: '비밀번호는 72바이트 이하여야 합니다',
    }),
})

export const emailVerificationSchema = z.object({
  code: z.string().regex(/^\d{6}$/, '인증 코드는 6자리 숫자여야 합니다'),
})

export type LoginFormValues = z.infer<typeof loginSchema>
export type SignupFormValues = z.infer<typeof signupSchema>
export type EmailVerificationFormValues = z.infer<typeof emailVerificationSchema>
