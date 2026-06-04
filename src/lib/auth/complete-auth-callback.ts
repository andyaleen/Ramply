import type { SupabaseClient } from '@supabase/supabase-js'
import type { EmailOtpType } from '@supabase/supabase-js'
import { getAuthConfirmNextPath } from '@/lib/auth/auth-redirect'
import { isPkceVerifierError, waitForAuthSession } from '@/lib/auth/wait-for-auth-session'

export type CompleteAuthCallbackParams = URLSearchParams

export type CompleteAuthCallbackResult =
  | { ok: true; nextPath: string }
  | { ok: false; error: string }

/**
 * Finishes an email or OAuth callback using query or hash auth parameters.
 */
export async function completeAuthCallback(
  supabase: SupabaseClient,
  params: CompleteAuthCallbackParams
): Promise<CompleteAuthCallbackResult> {
  const authError = params.get('error_description') || params.get('error')
  if (authError) {
    return { ok: false, error: authError }
  }

  const type = params.get('type')
  const nextPath = getAuthConfirmNextPath(params.get('next'), type)
  const token_hash = params.get('token_hash')
  const code = params.get('code')
  const access_token = params.get('access_token')
  const refresh_token = params.get('refresh_token')

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash,
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true, nextPath }
  }

  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token })
    if (error) return { ok: false, error: error.message }
    return { ok: true, nextPath }
  }

  if (code) {
    const { data: existingSession } = await supabase.auth.getSession()
    if (existingSession.session && type !== 'recovery') {
      return { ok: true, nextPath }
    }

    if (await waitForAuthSession(supabase)) {
      return { ok: true, nextPath }
    }

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      if (isPkceVerifierError(error.message) && (await waitForAuthSession(supabase))) {
        return { ok: true, nextPath }
      }
      if (isPkceVerifierError(error.message)) {
        return {
          ok: false,
          error:
            'Open the reset link in the same browser where you clicked Forgot password, or request a new reset email from ramply.org/login.',
        }
      }
      return { ok: false, error: error.message }
    }
    return { ok: true, nextPath }
  }

  return { ok: false, error: 'No authorization code provided' }
}
