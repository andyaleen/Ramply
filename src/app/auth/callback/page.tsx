'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LoadingFallback } from '@/components/LoadingFallback'
import { Layout } from '@/components/layout'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

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

      const sessionUser = data.session?.user

      if (error || !sessionUser) {
        const message = error?.message || 'Authentication failed'
        router.replace(`/auth/auth-code-error?error=${encodeURIComponent(message)}`)
        return
      }

      window.location.replace(`/post-login?next=${encodeURIComponent(next)}`)
    }

    completeAuth()

    return () => {
      cancelled = true
    }
  }, [router, searchParams])

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
