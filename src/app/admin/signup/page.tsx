'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Layout } from '@/components/layout'

export default function AdminSignUpPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to login page with signup tab since admin registration is now integrated
    router.push('/login?tab=signup')
  }, [router])

  return (
    <Layout showAuth={false}>
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-700 text-lg">Redirecting to login page...</p>
      </div>
    </Layout>
  )
}
