'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingFallback } from '@/components/LoadingFallback'
import { getProtectedRouteRedirect } from '@/lib/auth/routing'

interface ProtectedAppShellProps {
  children: React.ReactNode
}

/**
 * Keeps protected app routes session-first while centralizing role and profile
 * completion redirects in one place.
 */
export function ProtectedAppShell({ children }: ProtectedAppShellProps) {
  const { user, userProfile, company, loading, profileLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const redirectPath =
    !loading && user && !profileLoading && userProfile
      ? getProtectedRouteRedirect(pathname, userProfile, company)
      : null

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`)
      return
    }

    if (profileLoading || !userProfile) {
      return
    }

    if (redirectPath) {
      router.replace(redirectPath)
    }
  }, [loading, pathname, profileLoading, redirectPath, router, user, userProfile])

  if (loading || !user) {
    return (
      <LoadingFallback
        title="Checking Authentication"
        description="Please wait while we verify your session..."
        onRefresh={() => window.location.reload()}
      />
    )
  }

  if (profileLoading || !userProfile) {
    return (
      <LoadingFallback
        title="Preparing Your Workspace"
        description="Loading your company profile and account access..."
        onRefresh={() => window.location.reload()}
      />
    )
  }

  if (redirectPath) {
    return (
      <LoadingFallback
        title="Redirecting"
        description="Taking you to the right part of Ramply..."
        showTimeoutWarning={false}
      />
    )
  }

  return <>{children}</>
}
