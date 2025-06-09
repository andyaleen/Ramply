'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Layout } from '@/components/layout'
import { AuthForm } from '@/components/auth/AuthForm'
import { createClient } from '@/lib/supabase/client'

// ✅ Create supabase client outside the component
const supabase = createClient()

export default function LoginPage() {
  const { user, loading } = useAuth()
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
    if (!checkingSession && !loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, checkingSession, router])

  // ✅ Don't render form until checks complete
  if (loading || checkingSession) {
    return (
      <Layout showAuth={false}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
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
