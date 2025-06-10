'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Layout } from '@/components/layout'
import { AuthForm } from '@/components/auth/AuthForm'

export default function SignUpPage() {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user && userProfile) {
      // Role-based redirection for signup
      if (userProfile.role === 'admin') {
        console.log('Signup page: Redirecting admin user to /admin')
        router.push('/admin')
      } else {
        console.log('Signup page: Redirecting regular user to /dashboard')
        router.push('/dashboard')
      }
    }
  }, [user, userProfile, loading, router])

  if (loading) {
    return (
      <Layout showAuth={false}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  if (user) {
    return null // Will redirect to dashboard
  }

  return (
    <Layout showAuth={false}>
      <AuthForm defaultTab="signup" />
    </Layout>
  )
}
