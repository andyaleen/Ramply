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
 *
 * Only the initial session check blocks the UI. Once a user is authenticated,
 * the app shell and route content render immediately; individual pages show
 * their own skeletons while profile/company data bootstraps in the background.
 */
export function ProtectedAppShell({ children }: ProtectedAppShellProps) {
  const { user, userProfile, company, loading, profileLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`)
      return
    }

    if (profileLoading || !userProfile) {
      return
    }

    const redirectPath = getProtectedRouteRedirect(pathname, userProfile, company)
    if (redirectPath) {
      router.replace(redirectPath)
    }
  }, [company, loading, pathname, profileLoading, router, user, userProfile])

  if (loading || !user) {
    return (
      <LoadingFallback
        title="Checking Authentication"
        description="Please wait while we verify your session..."
        onRefresh={() => window.location.reload()}
      />
    )
  }

  return <>{children}</>
}
