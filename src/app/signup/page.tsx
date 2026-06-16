'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { AuthForm } from '@/components/auth/AuthForm'
import { LoadingFallback } from '@/components/LoadingFallback'
import { MarketingPublicShell } from '@/components/marketing/MarketingPublicShell'

function SignUpContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const referralToken = searchParams.get('ref')
  const redirectPath =
    searchParams.get('redirect')
    ?? (referralToken ? `/complete-profile?ref=${encodeURIComponent(referralToken)}` : undefined)

  useEffect(() => {
    if (!loading && user) {
      router.replace(redirectPath ?? '/dashboard')
    }
  }, [user, loading, redirectPath, router])

  if (loading) {
    return (
      <MarketingPublicShell>
        <main className="flex flex-1 items-center justify-center px-6 py-12">
          <LoadingFallback
            title="Loading"
            description="Checking your session..."
            showTimeoutWarning={false}
          />
        </main>
      </MarketingPublicShell>
    )
  }

  if (user) {
    return null
  }

  return <AuthForm mode="signup" redirectPath={redirectPath} />
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <MarketingPublicShell>
          <main className="flex flex-1 items-center justify-center px-6 py-12">
            <LoadingFallback
              title="Loading"
              description="Loading sign up page..."
              showTimeoutWarning={false}
            />
          </main>
        </MarketingPublicShell>
      }
    >
      <SignUpContent />
    </Suspense>
  )
}
