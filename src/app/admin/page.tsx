'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { AdminDashboard } from '@/components/dashboard/AdminDashboard'
import { ProfileSetup } from '@/components/profile/ProfileSetup'
import { LoadingFallback } from '@/components/LoadingFallback'

export default function AdminPage() {
  const { user, userProfile, loading, isAdmin } = useAuth()
  const router = useRouter()
  
  // Memoize profile completeness check to prevent unnecessary recalculations
  const isProfileIncomplete = useMemo(
    () => userProfile && (!userProfile.company_name || !userProfile.contact_name),
    [userProfile]
  )

  useEffect(() => {
    // Only log when there are actual state changes
    if (!loading) {
      if (!user) {
        console.log('❌ AdminPage: No user found, redirecting to /login')
        router.push('/login')
      } else if (user && userProfile && !isAdmin) {
        console.log('❌ AdminPage: User is not admin, redirecting to /dashboard. Role:', userProfile?.role)
        router.push('/dashboard')
      } else if (user && userProfile && isAdmin) {
        console.log('✅ AdminPage: Admin access confirmed. Role:', userProfile?.role)
      }
    }
  }, [user, loading, router, isAdmin, userProfile])

  // Show loading spinner while loading auth state
  if (loading) {
    return (
      <div className="p-6">
        <LoadingFallback 
          title="Loading Admin Dashboard"
          description="Verifying your admin permissions..."
          onRefresh={() => window.location.reload()}
        />
      </div>
    )
  }

  // If not loading but no user - show a friendly message before redirect happens
  if (!loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-700 text-lg">Redirecting to login...</p>
      </div>
    )
  }

  // If user exists but is not admin, show access denied
  if (!loading && user && userProfile && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-3xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-700 mb-6">
            You don&apos;t have administrator privileges to access this page.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // If user exists but profile is still loading
  if (!loading && user && !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user profile...</p>
        </div>
      </div>
    )
  }

  // If user is authenticated, but profile is incomplete, show profile setup
  if (!loading && user && userProfile && isProfileIncomplete) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome to Onbo
            </h1>
            <p className="text-gray-600">
              Let&apos;s set up your company profile to start creating onboarding flows for your vendors and customers.
            </p>
          </div>
          <ProfileSetup onComplete={() => window.location.reload()} />
        </div>
      </div>
    )
  }

  // If user and profile both ready, show main dashboard
  return <AdminDashboard />
}
