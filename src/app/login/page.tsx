'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { AuthForm } from '@/components/auth/AuthForm'
import { LoadingFallback } from '@/components/LoadingFallback'
import { MarketingPublicShell } from '@/components/marketing/MarketingPublicShell'
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
      <MarketingPublicShell>
        <main className="flex flex-1 items-center justify-center px-6 py-12">
          <LoadingFallback
            title="Checking Authentication"
            description="Please wait while we verify your session..."
            onRefresh={() => window.location.reload()}
          />
        </main>
      </MarketingPublicShell>
    )
  }

  return (
    <Suspense
      fallback={
        <MarketingPublicShell>
          <main className="flex flex-1 items-center justify-center px-6 py-12">
            <LoadingFallback
              title="Loading"
              description="Loading authentication form..."
              onRefresh={() => window.location.reload()}
            />
          </main>
        </MarketingPublicShell>
      }
    >
      <AuthForm mode="signin" />
    </Suspense>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <MarketingPublicShell>
          <main className="flex flex-1 items-center justify-center px-6 py-12">
            <LoadingFallback
              title="Loading"
              description="Loading login page..."
              onRefresh={() => window.location.reload()}
            />
          </main>
        </MarketingPublicShell>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
