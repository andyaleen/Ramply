'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Layout } from '@/components/layout'
import { AuthForm } from '@/components/auth/AuthForm'
import { LoadingFallback } from '@/components/LoadingFallback'
import { createClient } from '@/lib/supabase/client'

// ✅ Create supabase client
const supabase = createClient()

function LoginContent() {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [checkingSession, setCheckingSession] = useState(true)

  // ✅ Extract redirect query param (default to /dashboard)
  const redirectPath = searchParams.get('redirect') || '/dashboard'

  // ✅ Check session once on mount
  useEffect(() => {
    const refreshSession = async () => {
      try {
        await supabase.auth.getSession()
      } finally {
        setCheckingSession(false)
      }
    }
    refreshSession()
  }, [])

  // ✅ Redirect only if user + profile exist and checks are done
  useEffect(() => {
    if (!checkingSession && !loading && user && userProfile) {
      if (userProfile.role === 'admin') {
        console.log('Redirecting admin to /admin')
        router.push('/admin')
      } else {
        console.log(`Redirecting user to ${redirectPath}`)
        router.push(redirectPath)
      }
    }
  }, [user, userProfile, loading, checkingSession, redirectPath, router])

  // ✅ While checking session or loading user info
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
  // ✅ Show AuthForm if not authenticated yet
  return (
    <Layout showAuth={false}>
      <Suspense fallback={
        <LoadingFallback
          title="Loading"
          description="Loading authentication form..."
          onRefresh={() => window.location.reload()}
        />
      }>
        <AuthForm />
      </Suspense>
    </Layout>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <Layout showAuth={false}>
        <LoadingFallback
          title="Loading"
          description="Loading login page..."
          onRefresh={() => window.location.reload()}
        />
      </Layout>
    }>
      <LoginContent />
    </Suspense>
  )
}
