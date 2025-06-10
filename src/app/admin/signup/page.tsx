'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Layout } from '@/components/layout'
import { AdminSignUpForm } from '@/components/auth/AdminSignUpForm'

export default function AdminSignUpPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push('/admin')
    }
  }, [user, loading, router])

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
    return null // Will redirect to admin dashboard
  }

  return (
    <Layout showAuth={false}>
      <AdminSignUpForm />
    </Layout>
  )
}
