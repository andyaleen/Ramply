'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { Layout } from '@/components/layout'

export default function DashboardPage() {
  const { user, loading, isAdmin } = useAuth()
  const router = useRouter()
  useEffect(() => {
    // Redirect to login if not authenticated
    if (!loading && !user) {
      router.push('/login')
    }
    
    // Redirect admin users to admin page
    if (!loading && user && isAdmin) {
      console.log('Admin user detected, redirecting to /admin')
      router.push('/admin')
    }
  }, [user, loading, router, isAdmin])

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

  // Admin users should be redirected to /admin, so this should only show for non-admin users
  return <Dashboard />
}
