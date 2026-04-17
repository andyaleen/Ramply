'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Layout } from '@/components/layout'
import { LoadingFallback } from '@/components/LoadingFallback'
import { useAuth } from '@/contexts/AuthContext'
import { getPostLoginDestination } from '@/lib/auth/routing'

export default function PostLoginPage() {
  const { user, userProfile, company, loading, profileLoading, refreshUserProfile } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next')

  useEffect(() => {
    if (loading) return

    if (!user) {
      const redirectSuffix = nextPath ? `?redirect=${encodeURIComponent(nextPath)}` : ''
      router.replace(`/login${redirectSuffix}`)
      return
    }

    if (!profileLoading && !userProfile) {
      void refreshUserProfile()
      return
    }

    if (profileLoading || !userProfile) {
      return
    }

    router.replace(getPostLoginDestination(nextPath, userProfile, company))
  }, [company, loading, nextPath, profileLoading, refreshUserProfile, router, user, userProfile])

  return (
    <Layout showAuth={false}>
      <LoadingFallback
        title="Signing You In"
        description="Setting up your account and routing you to the right place..."
        onRefresh={() => window.location.reload()}
      />
    </Layout>
  )
}
