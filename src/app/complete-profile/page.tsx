'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Layout } from '@/components/layout'
import { LoadingFallback } from '@/components/LoadingFallback'
import { ProfileSetup } from '@/components/profile/ProfileSetup'
import { useAuth } from '@/contexts/AuthContext'
import { getAuthorizedAppPath, getDefaultAuthenticatedPath, isCompanyProfileComplete } from '@/lib/auth/routing'

function CompleteProfileContent() {
  const { user, userProfile, company, loading, profileLoading, refreshUserProfile } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next')
  const referralToken = searchParams.get('ref')
  const [inviteHeadline, setInviteHeadline] = useState<string | undefined>()

  useEffect(() => {
    if (!referralToken) {
      setInviteHeadline(undefined)
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const res = await fetch(`/api/referrals/resolve?ref=${encodeURIComponent(referralToken)}`)
        if (!res.ok || cancelled) return
        const payload = await res.json() as { invite_headline?: string }
        if (!cancelled && payload.invite_headline) {
          setInviteHeadline(payload.invite_headline)
        }
      } catch {
        // Referral banner is optional; profile setup still works without it.
      }
    })()

    return () => {
      cancelled = true
    }
  }, [referralToken])

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
        inviteHeadline={inviteHeadline}
        onComplete={() => {
          const fallbackPath = getDefaultAuthenticatedPath(userProfile)
          const destination = getAuthorizedAppPath(nextPath, userProfile) || fallbackPath
          router.replace(destination)
        }}
      />
    </Layout>
  )
}

export default function CompleteProfilePage() {
  return (
    <Suspense
      fallback={
        <Layout showAuth={false}>
          <LoadingFallback
            title="Preparing Profile Setup"
            description="Loading your account details..."
            onRefresh={() => window.location.reload()}
          />
        </Layout>
      }
    >
      <CompleteProfileContent />
    </Suspense>
  )
}
