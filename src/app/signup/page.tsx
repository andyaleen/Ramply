'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Layout } from '@/components/layout'
import { AuthForm } from '@/components/auth/AuthForm'
import { LoadingFallback } from '@/components/LoadingFallback'

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
      <Layout showAuth={false} showHeader={false} showFooter={false} className="bg-[#F0EFE9]">
        <LoadingFallback
          title="Loading"
          description="Checking your session..."
          showTimeoutWarning={false}
        />
      </Layout>
    )
  }

  if (user) {
    return null
  }

  return (
    <Layout showAuth={false} showHeader={false} showFooter={false} className="bg-[#F0EFE9]">
      <AuthForm defaultTab="signup" redirectPath={redirectPath} />
    </Layout>
  )
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <Layout showAuth={false} showHeader={false} showFooter={false} className="bg-[#F0EFE9]">
          <LoadingFallback
            title="Loading"
            description="Loading sign up page..."
            showTimeoutWarning={false}
          />
        </Layout>
      }
    >
      <SignUpContent />
    </Suspense>
  )
}
