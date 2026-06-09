'use client'

import { buildSupabaseAuthRedirectUrl } from '@/lib/auth/auth-redirect'
import { clearPasswordRecoveryPending } from '@/lib/auth/password-recovery-pending'
import { createClient } from '@/lib/supabase/client'

/**
 * Starts the Supabase Google OAuth flow and returns any user-facing error.
 */
export async function startGoogleAuth(next = '/dashboard'): Promise<string | null> {
  try {
    clearPasswordRecoveryPending()
    const supabase = createClient()
    const redirectTo = buildSupabaseAuthRedirectUrl(next)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })

    if (error) return error.message

    if (data?.url) {
      window.location.assign(data.url)
      return null
    }

    return 'Google sign-in could not be started. Please try again.'
  } catch (err) {
    console.error('Google sign-in error:', err)

    if (err instanceof TypeError && err.message === 'Failed to fetch') {
      return 'Unable to connect. Please check your internet connection and try again.'
    }

    return 'Google sign-in failed. Please try again.'
  }
}
