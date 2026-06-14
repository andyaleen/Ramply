export const INVALID_SIGN_IN_CREDENTIALS_MESSAGE = 'Invalid credentials.'

export const INVALID_SIGN_IN_CREDENTIALS_CODE = 'invalid_credentials'

export const UNEXPECTED_AUTH_ERROR_MESSAGE = 'An unexpected error occurred'

/** Matches Supabase password sign-in failures (wording varies by version). */
export function isInvalidCredentialsAuthError(message: string | undefined): boolean {
  if (!message) return false
  const lower = message.toLowerCase()
  return lower.includes('invalid login credentials') || lower.includes('invalid credentials')
}

export const INVITE_CONFIRMATION_FAILURE_MESSAGE =
  'Unable to confirm this invite. Check the invite email and try again.'

export const INVITE_CONFIRMATION_FAILURE_CODE = 'invite_confirmation_failed'

export const SIGN_IN_FAILURE_MESSAGE = 'Unable to sign in. Please try again.'

export const SIGN_IN_FAILURE_CODE = 'sign_in_failed'

export type CompletePasswordSignInErrorCode =
  | typeof INVALID_SIGN_IN_CREDENTIALS_CODE
  | typeof INVITE_CONFIRMATION_FAILURE_CODE
  | typeof SIGN_IN_FAILURE_CODE

export const RATE_LIMITED_SIGN_IN_MESSAGE = 'Too many attempts. Please try again later.'

type PasswordSignInApiPayload = {
  error?: unknown
  code?: string
}

/** Maps complete-sign-in API responses to safe UI copy. */
export function resolvePasswordSignInApiError(
  payload: PasswordSignInApiPayload,
  httpStatus?: number,
): string {
  if (payload.code === 'RATE_LIMITED' || httpStatus === 429) {
    return RATE_LIMITED_SIGN_IN_MESSAGE
  }
  if (payload.code === INVALID_SIGN_IN_CREDENTIALS_CODE) {
    return INVALID_SIGN_IN_CREDENTIALS_MESSAGE
  }
  if (typeof payload.error === 'string' && payload.error.trim()) {
    return normalizeDirectAuthErrorMessage(payload.error)
  }
  return UNEXPECTED_AUTH_ERROR_MESSAGE
}

/** Formats Supabase client auth errors shown outside the complete-sign-in API. */
export function normalizeDirectAuthErrorMessage(message: string | undefined): string {
  if (!message) return UNEXPECTED_AUTH_ERROR_MESSAGE
  if (message === 'Failed to fetch' || message.includes('fetch') || message.includes('network')) {
    return 'Unable to connect. Please check your internet connection and try again.'
  }
  if (isInvalidCredentialsAuthError(message)) {
    return INVALID_SIGN_IN_CREDENTIALS_MESSAGE
  }
  if (message.includes('Email not confirmed')) {
    return 'We could not sign you in yet. Try again or contact support if this continues.'
  }
  if (message.includes('User already registered')) {
    return 'We could not create an account with those details. Try signing in, or use Continue with Google.'
  }
  if (message.includes('invalid') && message.includes('email')) {
    return 'The email address format is not accepted. Please try a different email address.'
  }
  return message
}
