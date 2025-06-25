import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/dashboard'

    console.log('🔗 Auth callback received:', {
      code: code ? `${code.substring(0, 10)}...` : null,
      next,
      origin,
      url: request.url
    })

    if (!code) {
      console.error('❌ No authorization code provided in callback')
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

    console.log('🔄 Code exchange result:', {
      hasSession: !!data.session,
      hasUser: !!data.user,
      userEmail: data.user?.email,
      error: error?.message
    })

    if (error || !data.session) {
      console.error('❌ Code exchange failed:', error?.message)
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(error?.message || 'Authentication failed')}`)
    }    const userId = data.session.user.id
    const userEmail = data.session.user.email

    console.log('👤 Processing user:', { userId, userEmail })

    // Check for user profile in the users table
    const { data: userProfile, error: fetchError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    console.log('🔍 Profile fetch result:', {
      hasProfile: !!userProfile,
      role: userProfile?.role,
      fetchError: fetchError?.message
    })

    // If profile not found, create one with default external role
    let finalUserProfile = userProfile
    if (fetchError || !userProfile) {
      console.log('🆕 Creating new user profile...')
      const { data: newProfile, error: createError } = await supabase
        .from('users')
        .insert([
          {
            id: userId,
            email: userEmail,
            role: 'external',
          },
        ])
        .select('role')
        .single()

      if (createError) {
        console.error('❌ Error creating user profile:', createError)
        finalUserProfile = { role: 'external' }
      } else {
        console.log('✅ Profile created successfully:', newProfile)
        finalUserProfile = newProfile
      }
    }

    // Role-based redirect
    const finalRedirectUrl = (next === '/dashboard' && finalUserProfile?.role === 'admin') ? '/admin' : next
    
    console.log('🎯 Redirecting to:', finalRedirectUrl)
    
    if (finalRedirectUrl !== next) {
      response.headers.set('Location', `${origin}${finalRedirectUrl}`)
    } else {
      response.headers.set('Location', `${origin}${next}`)
    }

    return response
  } catch (err) {
    console.error('💥 Callback route error:', err)
    const { origin } = new URL(request.url)
    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=Internal server error`)
  }
}
