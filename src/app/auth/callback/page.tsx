'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LoadingFallback } from '@/components/LoadingFallback'
import { Layout } from '@/components/layout'
import { useAuth } from '@/contexts/AuthContext'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    const code = searchParams.get('code')
    const next = searchParams.get('next') || '/dashboard'
    const authError = searchParams.get('error_description') || searchParams.get('error')

    if (!code) {
      router.replace('/auth/auth-code-error?error=No authorization code provided')
      return
    }

    if (authError) {
      router.replace(`/auth/auth-code-error?error=${encodeURIComponent(authError)}`)
      return
    }

    if (!loading && user) {
      // Send the user straight to their destination — profile completeness
      // is handled by the dashboard shell once they land.
      window.location.replace(next)
      return
    }

    if (!loading && !user && timedOut) {
      router.replace('/auth/auth-code-error?error=Authentication session could not be established')
    }
  }, [loading, router, searchParams, timedOut, user])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTimedOut(true)
    }, 5000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [])

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
