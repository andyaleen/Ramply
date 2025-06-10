import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/dashboard'

    if (code) {
      const cookieStore = await cookies()
      
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value
            },
            set(name: string, value: string, options: Record<string, unknown>) {
              cookieStore.set({ name, value, ...options })
            },
            remove(name: string, options: Record<string, unknown>) {
              cookieStore.set({ name, value: '', ...options })
            },
          },
        }
      )
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (!error && data.session) {
        // Check user role to determine redirect destination
        const { data: userProfile } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.session.user.id)
          .single()
        
        // Determine redirect URL based on role
        let redirectUrl = next
        if (next === '/dashboard' && userProfile?.role === 'admin') {
          redirectUrl = '/admin'
          console.log('Auth callback: Redirecting admin user to /admin')
        } else {
          console.log('Auth callback: Redirecting to:', redirectUrl)
        }
        
        return NextResponse.redirect(`${origin}${redirectUrl}`)
      } else {
        console.error('Auth exchange error:', error)
        return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(error?.message || 'Authentication failed')}`)
      }
    }

    console.log('No code provided, redirecting to error page')
    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent('No authorization code provided')}`)
  } catch (err) {
    console.error('Callback route error:', err)
    const { origin } = new URL(request.url)
    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent('Internal server error')}`)
  }
}
