// Role-based navigation utilities
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export interface UserProfile {
  role: 'admin' | 'external'
}

/**
 * Get the appropriate dashboard route based on user role
 */
export function getDashboardRoute(userRole: string | undefined): string {
  return userRole === 'admin' ? '/admin' : '/dashboard'
}

/**
 * Hook for role-based navigation
 */
export function useRoleBasedNavigation() {
  const router = useRouter()
  const { userProfile } = useAuth()

  const navigateToDashboard = () => {
    const route = getDashboardRoute(userProfile?.role)
    console.log(`Navigating to ${route} for role: ${userProfile?.role}`)
    router.push(route)
  }

  const navigateToAdminPage = () => {
    if (userProfile?.role === 'admin') {
      router.push('/admin')
    } else {
      // Redirect non-admin users to regular dashboard
      router.push('/dashboard')
    }
  }

  return {
    navigateToDashboard,
    navigateToAdminPage,
    getDashboardRoute: () => getDashboardRoute(userProfile?.role),
    isAdmin: userProfile?.role === 'admin'
  }
}

/**
 * Server-side utility for role-based redirection
 */
export function getRedirectUrlForRole(userRole: string | undefined, defaultUrl: string = '/dashboard'): string {
  if (defaultUrl === '/dashboard' && userRole === 'admin') {
    return '/admin'
  }
  return defaultUrl
}
