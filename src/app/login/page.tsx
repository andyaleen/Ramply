'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Layout } from '@/components/layout'
import { AuthForm } from '@/components/auth/AuthForm'
import { LoadingFallback } from '@/components/LoadingFallback'
import { createClient } from '@/lib/supabase/client'

// ✅ Create supabase client outside the component
const supabase = createClient()

export default function LoginPage() {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()
  const [checkingSession, setCheckingSession] = useState(true)

  // ✅ Refresh Supabase session on mount
  useEffect(() => {
    const refreshSession = async () => {
      await supabase.auth.getSession()
      setCheckingSession(false)
    }
    refreshSession()
  }, [])
  // ✅ Redirect if authenticated
  useEffect(() => {
    if (!checkingSession && !loading && user && userProfile) {
      // Role-based redirection
      if (userProfile.role === 'admin') {
        console.log('Login page: Redirecting admin user to /admin')
        router.push('/admin')
      } else {
        console.log('Login page: Redirecting regular user to /dashboard')
        router.push('/dashboard')
      }
    }
  }, [user, userProfile, loading, checkingSession, router])
  // ✅ Don't render form until checks complete
  if (loading || checkingSession) {
    return (
      <Layout showAuth={false}>
        <LoadingFallback 
          title="Checking Authentication"
          description="Please wait while we verify your session..."
          onRefresh={() => window.location.reload()}
        />
      </Layout>
    )
  }

  // Prevent rendering login form if already logged in (redirect will fire)
  if (user) return null

  return (
    <Layout showAuth={false}>
      <AuthForm />
    </Layout>
  )
}
