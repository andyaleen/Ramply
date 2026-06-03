import { completeAuthCallback } from '@/lib/auth/complete-auth-callback'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Exchanges auth codes server-side using PKCE cookies from the same browser session.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const authError = searchParams.get('error_description') || searchParams.get('error')

  if (authError) {
    const errorUrl = new URL('/auth/auth-code-error', origin)
    errorUrl.searchParams.set('error', authError)
    return NextResponse.redirect(errorUrl)
  }

  if (!code && !token_hash) {
    return NextResponse.next()
  }

  const supabase = await createClient()
  const result = await completeAuthCallback(supabase, searchParams)

  if (!result.ok) {
    const errorUrl = new URL('/auth/auth-code-error', origin)
    errorUrl.searchParams.set('error', result.error)
    if (result.error.toLowerCase().includes('code verifier')) {
      errorUrl.searchParams.set(
        'error',
        'This reset link must be opened in the same browser where you clicked Forgot password. ' +
          'Request a new link at https://ramply.org/login and open it in that browser. ' +
          'Also add https://ramply.org/auth/confirm to Supabase Auth redirect URLs.'
      )
    }
    return NextResponse.redirect(errorUrl)
  }

  return NextResponse.redirect(new URL(result.nextPath, origin))
}
