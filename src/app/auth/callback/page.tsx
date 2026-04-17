'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LoadingFallback } from '@/components/LoadingFallback'
import { Layout } from '@/components/layout'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const completeAuth = async () => {
      const code = searchParams.get('code')
      const next = searchParams.get('next') || '/dashboard'

      if (!code) {
        if (!cancelled) {
          router.replace('/auth/auth-code-error?error=No authorization code provided')
        }
        return
      }

      const supabase = createClient()
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (cancelled) return

      if (error || !data.session?.user) {
        const message = error?.message || 'Authentication failed'
        setError(message)
        router.replace(`/auth/auth-code-error?error=${encodeURIComponent(message)}`)
        return
      }

      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.session.user.id)
        .maybeSingle()

      const destination =
        next === '/dashboard' && userProfile?.role === 'admin'
          ? '/admin'
          : next

      router.replace(destination)
    }

    completeAuth()

    return () => {
      cancelled = true
    }
  }, [router, searchParams])

  if (error) {
    return (
      <Layout showAuth={false}>
        <LoadingFallback
          title="Authentication Error"
          description={error}
          showTimeoutWarning={false}
        />
      </Layout>
    )
  }

  return (
    <Layout showAuth={false}>
      <LoadingFallback
        title="Completing Sign In"
        description="Please wait while we finish your authentication..."
        onRefresh={() => window.location.reload()}
      />
    </Layout>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <Layout showAuth={false}>
          <LoadingFallback
            title="Completing Sign In"
            description="Preparing your secure session..."
            onRefresh={() => window.location.reload()}
          />
        </Layout>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  )
}
