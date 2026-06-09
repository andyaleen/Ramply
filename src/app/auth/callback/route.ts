import { getAuthConfirmNextPath } from '@/lib/auth/auth-redirect'
import { formatAuthExchangeError } from '@/lib/auth/auth-exchange-errors'
import { applyPasswordRecoveryRoutingHints } from '@/lib/auth/password-recovery-pending'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

/**
 * Handles Supabase auth return URLs.
 * PKCE `code` and `token_hash` links are verified here so session cookies
 * are set on the server using the browser's PKCE cookie.
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
    const destination = new URL(next, origin)
    const { supabase, getResponse } = createRouteHandlerClient(request, () =>
      NextResponse.redirect(destination),
    )

    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash,
    })

    if (error) {
      const errorUrl = new URL('/auth/auth-code-error', origin)
      errorUrl.searchParams.set('error', formatAuthExchangeError(error.message))
      return NextResponse.redirect(errorUrl)
    }

    return getResponse()
  }

  if (code) {
    applyPasswordRecoveryRoutingHints(searchParams)

    const destination = new URL('/auth/oauth-complete', origin)
    destination.searchParams.set('next', next)
    if (type) destination.searchParams.set('type', type)

    const { supabase, getResponse } = createRouteHandlerClient(request, () =>
      NextResponse.redirect(destination),
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      const errorUrl = new URL('/auth/auth-code-error', origin)
      errorUrl.searchParams.set('error', formatAuthExchangeError(error.message))
      return NextResponse.redirect(errorUrl)
    }

    return getResponse()
  }

  const errorUrl = new URL('/auth/auth-code-error', origin)
  errorUrl.searchParams.set('error', 'No authorization code provided')
  return NextResponse.redirect(errorUrl)
}
