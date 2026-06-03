'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Layout } from '@/components/layout'
import { AuthForm } from '@/components/auth/AuthForm'
import { LoadingFallback } from '@/components/LoadingFallback'
import { normalizeRequestedPath } from '@/lib/auth/routing'
import {
  buildAuthConfirmPath,
  getAuthCallbackParamsFromLocation,
  hasAuthCallbackParams,
} from '@/lib/auth/parse-auth-callback-params'

function LoginContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectPath = normalizeRequestedPath(searchParams.get('redirect'), '/dashboard')

  useEffect(() => {
    const params = getAuthCallbackParamsFromLocation()
    if (hasAuthCallbackParams(params)) {
      router.replace(buildAuthConfirmPath(params))
      return
    }

    if (!loading && user) {
      router.replace(redirectPath)
    }
  }, [user, loading, redirectPath, router])

  if (loading) {
    return (
      <Layout showAuth={false} showHeader={false} showFooter={false} className="bg-[#F0EFE9]">
        <LoadingFallback
          title="Checking Authentication"
          description="Please wait while we verify your session..."
          onRefresh={() => window.location.reload()}
        />
      </Layout>
    )
  }

  return (
    <Layout showAuth={false} showHeader={false} showFooter={false} className="bg-[#F0EFE9]">
      <Suspense
        fallback={
          <LoadingFallback
            title="Loading"
            description="Loading authentication form..."
            onRefresh={() => window.location.reload()}
          />
        }
      >
        <AuthForm />
      </Suspense>
    </Layout>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Layout showAuth={false} showHeader={false} showFooter={false} className="bg-[#F0EFE9]">
          <LoadingFallback
            title="Loading"
            description="Loading login page..."
            onRefresh={() => window.location.reload()}
          />
        </Layout>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
