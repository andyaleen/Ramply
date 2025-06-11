import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/dashboard'

    if (!code) {
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=No authorization code provided`)
    }

    // Use mutable cookies (for setting auth cookies)
    const cookieStore = await cookies()

    // Prepare a response to pass for cookie mutation
    const response = NextResponse.redirect(`${origin}${next}`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value
          },
          set(name, value, options) {
            response.cookies.set(name, value, options)
          },
          remove(name, options) {
            response.cookies.set(name, '', {
              ...options,
              maxAge: -1,
            })
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error || !data.session) {
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(error?.message || 'Authentication failed')}`)
    }    const userId = data.session.user.id
    const userEmail = data.session.user.email    // Check for user profile
    const { data: userProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    // If profile not found, create one
    let finalUserProfile = userProfile
    if (fetchError || !userProfile) {
      await supabase.from('profiles').insert([
        {
          id: userId,
          email: userEmail,
          role: 'user',
          created_at: new Date().toISOString(),
        },
      ])
      finalUserProfile = { role: 'user' }
    }

    // Role-based redirect
    if (next === '/dashboard' && finalUserProfile?.role === 'admin') {
      response.headers.set('Location', `${origin}/admin`)
    } else {
      response.headers.set('Location', `${origin}${next}`)
    }

    return response
  } catch (err) {
    console.error('Callback route error:', err)
    const { origin } = new URL(request.url)
    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=Internal server error`)
  }
}
