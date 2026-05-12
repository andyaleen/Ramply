import { createClient } from '@/lib/supabase/server'
import { normalizeRequestedPath } from '@/lib/auth/routing'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Server-side handler that exchanges the OAuth/magic-link authorization code
 * for a Supabase session (PKCE flow) and redirects to the requested destination.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = normalizeRequestedPath(searchParams.get('next'), '/dashboard')
  const authError = searchParams.get('error_description') || searchParams.get('error')

  if (authError) {
    const errorUrl = new URL('/auth/auth-code-error', origin)
    errorUrl.searchParams.set('error', authError)
    return NextResponse.redirect(errorUrl)
  }

  if (!code) {
    const errorUrl = new URL('/auth/auth-code-error', origin)
    errorUrl.searchParams.set('error', 'No authorization code provided')
    return NextResponse.redirect(errorUrl)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    const errorUrl = new URL('/auth/auth-code-error', origin)
    errorUrl.searchParams.set('error', error.message)
    return NextResponse.redirect(errorUrl)
  }

  return NextResponse.redirect(new URL(next, origin))
}
