import { createClient } from '@/lib/supabase/server'
import { getAuthConfirmNextPath } from '@/lib/auth/auth-redirect'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

/**
 * Handles email auth links that include token_hash (server-safe).
 * PKCE `code` links are forwarded to /auth/confirm for browser cookie exchange.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const code = searchParams.get('code')
  const next = getAuthConfirmNextPath(searchParams.get('next'), type)
  const authError = searchParams.get('error_description') || searchParams.get('error')

  if (authError) {
    const errorUrl = new URL('/auth/auth-code-error', origin)
    errorUrl.searchParams.set('error', authError)
    return NextResponse.redirect(errorUrl)
  }

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash,
    })

    if (error) {
      const errorUrl = new URL('/auth/auth-code-error', origin)
      errorUrl.searchParams.set('error', error.message)
      return NextResponse.redirect(errorUrl)
    }

    return NextResponse.redirect(new URL(next, origin))
  }

  if (code) {
    const confirmUrl = new URL('/auth/confirm', origin)
    searchParams.forEach((value, key) => {
      confirmUrl.searchParams.set(key, value)
    })
    if (!confirmUrl.searchParams.get('next')) {
      confirmUrl.searchParams.set('next', next)
    }
    return NextResponse.redirect(confirmUrl)
  }

  const errorUrl = new URL('/auth/auth-code-error', origin)
  errorUrl.searchParams.set('error', 'No authorization code provided')
  return NextResponse.redirect(errorUrl)
}
