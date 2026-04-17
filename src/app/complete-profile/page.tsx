'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Layout } from '@/components/layout'
import { LoadingFallback } from '@/components/LoadingFallback'
import { ProfileSetup } from '@/components/profile/ProfileSetup'
import { useAuth } from '@/contexts/AuthContext'
import { getAuthorizedAppPath, getDefaultAuthenticatedPath, isCompanyProfileComplete } from '@/lib/auth/routing'

export default function CompleteProfilePage() {
  const { user, userProfile, company, loading, profileLoading, refreshUserProfile } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next')

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.replace('/login')
      return
    }

    if (!profileLoading && !userProfile) {
      void refreshUserProfile()
      return
    }

    if (profileLoading || !userProfile) {
      return
    }

    if (isCompanyProfileComplete(company)) {
      router.replace(getAuthorizedAppPath(nextPath, userProfile))
    }
  }, [company, loading, nextPath, profileLoading, refreshUserProfile, router, user, userProfile])

  if (loading || !user || profileLoading || !userProfile) {
    return (
      <Layout showAuth={false}>
        <LoadingFallback
          title="Preparing Profile Setup"
          description="Loading your account details..."
          onRefresh={() => window.location.reload()}
        />
      </Layout>
    )
  }

  return (
    <Layout showAuth={false}>
      <ProfileSetup
        onComplete={() => {
          const fallbackPath = getDefaultAuthenticatedPath(userProfile)
          const destination = getAuthorizedAppPath(nextPath, userProfile) || fallbackPath
          router.replace(destination)
        }}
      />
    </Layout>
  )
}
