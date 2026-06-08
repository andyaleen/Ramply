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

export type CompletePasswordSignInParams = {
  email: string
  password: string
  shareToken?: string
  /** From a fresh signUp() response — avoids listUsers race for new accounts. */
  userId?: string
}

export type CompletePasswordSignInErrorCode =
  | 'incorrect_password'
  | 'oauth_only'
  | 'user_not_found'

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

function invalidCredentialsMessage(signInError: AuthError): CompletePasswordSignInResult {
  return {
    ok: false,
    status: 401,
    error: signInError.message,
    code: 'incorrect_password',
  }
}

type CompletePasswordSignInFailure = Extract<CompletePasswordSignInResult, { ok: false }>

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
    if (!shareResult.ok) return shareResult
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

  if (!authUser) {
    return {
      ok: false,
      status: 404,
      error: 'No account found for this email. Sign up first or check for typos.',
      code: 'user_not_found',
    }
  }

  if (!authUserHasPasswordProvider(authUser)) {
    return {
      ok: false,
      status: 400,
      error: 'This email uses Google sign-in. Continue with Google instead of a password.',
      code: 'oauth_only',
    }
  }

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

  const emailAlreadyConfirmed = Boolean(authUser.email_confirmed_at)

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
      return invalidCredentialsMessage(signInError)
    }

    const canRetry = attempt < SIGN_IN_MAX_ATTEMPTS - 1
    if (!canRetry || !isSignInBlockedByConfirmation(signInError.message)) {
      break
    }

    const confirmResult = await adminConfirmAuthUserEmail(admin, email, authUser.id)
    if (!confirmResult.ok && confirmResult.status !== 404) {
      return { ok: false, status: confirmResult.status, error: confirmResult.error }
    }

    await delay(SIGN_IN_RETRY_DELAY_MS * (attempt + 1))
  }

  if (!signInError) {
    return { ok: true, session: signedInSession }
  }

  if (signInError.message.toLowerCase().includes('invalid login')) {
    return invalidCredentialsMessage(signInError)
  }

  return { ok: false, status: 400, error: signInError.message }
}
