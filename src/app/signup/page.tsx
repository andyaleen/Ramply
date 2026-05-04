'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Layout } from '@/components/layout'
import { AuthForm } from '@/components/auth/AuthForm'
import { LoadingFallback } from '@/components/LoadingFallback'

export default function SignUpPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <Layout showAuth={false} showHeader={false} showFooter={false} className="bg-[#F0EFE9]">
        <LoadingFallback
          title="Loading"
          description="Checking your session..."
          showTimeoutWarning={false}
        />
      </Layout>
    )
  }

  if (user) {
    return null
  }

  return (
    <Layout showAuth={false} showHeader={false} showFooter={false} className="bg-[#F0EFE9]">
      <AuthForm defaultTab="signup" />
    </Layout>
  )
}
