'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Layout } from '@/components/layout'
import { ShieldAlert } from 'lucide-react'

export default function PromotePage() {
  const router = useRouter()

  useEffect(() => {
    const redirectTimer = window.setTimeout(() => {
      router.replace('/dashboard')
    }, 2500)

    return () => {
      window.clearTimeout(redirectTimer)
    }
  }, [router])

  return (
    <Layout showAuth={false}>
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mb-4 flex items-center justify-center">
              <div className="rounded-full bg-blue-600 p-3">
                <ShieldAlert className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle>Role Changes Require Admin Approval</CardTitle>
            <CardDescription>
              Self-service admin promotion has been disabled for security.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700">
              Admin roles should only be granted through a reviewed backend or database process.
              Redirecting you back to the dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
