'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { ProfileSetup } from '@/components/profile/ProfileSetup'
import { Layout } from '@/components/layout'

export default function AdminPage() {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Show loading state
  if (loading) {
    return (
      <Layout showAuth={false}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  // Redirect if not authenticated
  if (!user) {
    return null
  }

  // Show profile setup if user profile is incomplete
  const isProfileIncomplete = !userProfile?.company_name || !userProfile?.contact_name
  if (isProfileIncomplete) {
    return (
      <Layout showAuth={false}>
        <div className="min-h-screen bg-gray-50 py-12">
          <div className="max-w-2xl mx-auto px-4">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Complete Your Company Profile
              </h1>
              <p className="text-gray-600">
                Before you can start creating onboarding flows, please complete your company profile information.
              </p>
            </div>
            <ProfileSetup onComplete={() => window.location.reload()} />
          </div>
        </div>
      </Layout>
    )
  }
  // Show main dashboard for authenticated users with complete profiles
  return <Dashboard />
}
