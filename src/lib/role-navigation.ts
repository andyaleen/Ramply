// Role-based navigation utilities
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export interface UserProfile {
  role: 'admin' | 'external'
}

/**
 * Returns the unified dashboard route for any authenticated user.
 * Role-based routing has been collapsed — all users land on /dashboard.
 * The userRole argument is retained for signature compatibility.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getDashboardRoute(userRole: string | undefined): string {
  return '/dashboard'
}

/**
 * Hook for dashboard navigation. The `isAdmin` flag is preserved for callers
 * that key non-routing behavior off of role, but all navigation helpers now
 * resolve to /dashboard.
 */
export function useRoleBasedNavigation() {
  const router = useRouter()
  const { userProfile } = useAuth()

  const navigateToDashboard = () => {
    router.push('/dashboard')
  }

  return {
    navigateToDashboard,
    navigateToAdminPage: navigateToDashboard,
    getDashboardRoute: () => '/dashboard',
    isAdmin: userProfile?.role === 'admin',
  }
}

/**
 * Server-side utility for post-auth redirection. Always returns the provided
 * destination (defaulting to /dashboard); the userRole argument is retained
 * for signature compatibility with legacy callers.
 */
export function getRedirectUrlForRole(userRole: string | undefined, defaultUrl: string = '/dashboard'): string {
  return defaultUrl
}
