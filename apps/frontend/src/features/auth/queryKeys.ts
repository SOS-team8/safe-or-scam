export const authKeys = {
  all: ['auth'] as const,
  session: () => [...authKeys.all, 'session'] as const,
  user: () => [...authKeys.session(), 'user'] as const,
  emailVerification: (email: string) => [...authKeys.all, 'email-verification', email] as const,
}
