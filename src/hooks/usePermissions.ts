import { useAuth } from '@/contexts/AuthContext'

export function usePermissions() {
  const { userProfile, isAdmin } = useAuth()

  return {
    isAdmin,
    canManageUsers: isAdmin,
    canCreateOnboardingTypes: isAdmin,
    canViewAllRequests: isAdmin,
    canPromoteUsers: isAdmin,
    hasRole: (role: 'admin' | 'external') => userProfile?.role === role,
  }
}
