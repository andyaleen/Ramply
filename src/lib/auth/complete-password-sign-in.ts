import type { SupabaseClient } from '@supabase/supabase-js'
import type { AuthError } from '@supabase/supabase-js'
import {
  adminConfirmAuthUserEmail,
  isSignInBlockedByConfirmation,
} from '@/lib/auth/admin-confirm-email'
import {
  authUserHasPasswordProvider,
  getAuthUserByEmail,
} from '@/lib/auth/lookup-auth-user'
import { confirmShareRecipientAccount } from '@/lib/auth/share-recipient-confirm'
import {
  INVALID_SIGN_IN_CREDENTIALS_CODE,
  INVALID_SIGN_IN_CREDENTIALS_MESSAGE,
  INVITE_CONFIRMATION_FAILURE_CODE,
  INVITE_CONFIRMATION_FAILURE_MESSAGE,
  SIGN_IN_FAILURE_CODE,
  SIGN_IN_FAILURE_MESSAGE,
  type CompletePasswordSignInErrorCode,
} from '@/lib/auth/sign-in-errors'
import { reportServerError } from '@/lib/monitoring'

export type CompletePasswordSignInParams = {
  email: string
  password: string
  shareToken?: string
  /** From a fresh signUp() response — avoids listUsers race for new accounts. */
  userId?: string
}

export type CompletePasswordSignInSession = {
  access_token: string
  refresh_token: string
}

export type CompletePasswordSignInResult =
  | { ok: true; session: CompletePasswordSignInSession | null }
  | { ok: false; status: number; error: string; code?: CompletePasswordSignInErrorCode }

const SIGN_IN_RETRY_DELAY_MS = 400
const SIGN_IN_MAX_ATTEMPTS = 4

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type CompletePasswordSignInFailure = Extract<CompletePasswordSignInResult, { ok: false }>

function invalidCredentialsFailure(): CompletePasswordSignInFailure {
  return {
    ok: false,
    status: 401,
    error: INVALID_SIGN_IN_CREDENTIALS_MESSAGE,
    code: INVALID_SIGN_IN_CREDENTIALS_CODE,
  }
}

/**
 * Confirms email when possible before the first sign-in attempt.
 */
async function ensureAccountCanSignIn(
  admin: SupabaseClient,
  params: CompletePasswordSignInParams
): Promise<CompletePasswordSignInFailure | null> {
  const email = params.email.trim()

  if (params.shareToken) {
    const shareResult = await confirmShareRecipientAccount(admin, {
      email,
      token: params.shareToken,
      userId: params.userId,
    })
    if (!shareResult.ok) {
      if (shareResult.status >= 500) return shareResult
      return {
        ok: false,
        status: 400,
        error: INVITE_CONFIRMATION_FAILURE_MESSAGE,
        code: INVITE_CONFIRMATION_FAILURE_CODE,
      }
    }
    return null
  }

  const confirmResult = await adminConfirmAuthUserEmail(admin, email, params.userId)
  if (!confirmResult.ok && confirmResult.status !== 404) {
    return confirmResult
  }

  return null
}

/**
 * Signs in with email/password and bypasses Supabase email confirmation when needed.
 */
export async function completePasswordSignIn(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  params: CompletePasswordSignInParams
): Promise<CompletePasswordSignInResult> {
  const email = params.email.trim()
  const password = params.password

  const preConfirmError = await ensureAccountCanSignIn(admin, params)
  if (preConfirmError && !preConfirmError.ok) {
    return preConfirmError
  }

  const authUser = await getAuthUserByEmail(admin, email, params.userId)
  let signedInSession: CompletePasswordSignInSession | null = null

  const attemptSignIn = async (): Promise<AuthError | null> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error && data.session) {
      signedInSession = {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      }
    }
    return error
  }

  const canRetryConfirmation = Boolean(authUser && authUserHasPasswordProvider(authUser))

  if (!canRetryConfirmation) {
    const signInError = await attemptSignIn()
    if (!signInError) {
      return { ok: true, session: signedInSession }
    }

    return invalidCredentialsFailure()
  }

  const emailAlreadyConfirmed = Boolean(authUser?.email_confirmed_at)
  let signInError: AuthError | null = null

  for (let attempt = 0; attempt < SIGN_IN_MAX_ATTEMPTS; attempt += 1) {
    signInError = await attemptSignIn()
    if (!signInError) {
      return { ok: true, session: signedInSession }
    }

    const isInvalidCredentials = signInError.message
      .toLowerCase()
      .includes('invalid login credentials')

    if (emailAlreadyConfirmed && isInvalidCredentials) {
      return invalidCredentialsFailure()
    }

    const canRetry = attempt < SIGN_IN_MAX_ATTEMPTS - 1
    if (!canRetry || !isSignInBlockedByConfirmation(signInError.message)) {
      break
    }

    const confirmResult = await adminConfirmAuthUserEmail(admin, email, authUser!.id)
    if (!confirmResult.ok && confirmResult.status !== 404) {
      return { ok: false, status: confirmResult.status, error: confirmResult.error }
    }

    await delay(SIGN_IN_RETRY_DELAY_MS * (attempt + 1))
  }

  if (!signInError) {
    return { ok: true, session: signedInSession }
  }

  if (signInError.message.toLowerCase().includes('invalid login')) {
    return invalidCredentialsFailure()
  }

  reportServerError('complete-password-sign-in', signInError)
  return {
    ok: false,
    status: 400,
    error: SIGN_IN_FAILURE_MESSAGE,
    code: SIGN_IN_FAILURE_CODE,
  }
}

export {
  INVALID_SIGN_IN_CREDENTIALS_CODE,
  INVALID_SIGN_IN_CREDENTIALS_MESSAGE,
} from '@/lib/auth/sign-in-errors'
