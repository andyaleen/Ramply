'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingFallback } from '@/components/LoadingFallback'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, BookTemplate, Users } from 'lucide-react'
import { TemplatesManager } from '@/components/templates/TemplatesManager'

/** Admin page for managing request templates. */
export default function TemplatesPage() {
  const { user, userProfile, loading, isAdmin } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) router.push('/login')
      else if (user && userProfile && !isAdmin) router.push('/dashboard')
    }
  }, [user, loading, router, isAdmin, userProfile])

  if (loading) {
    return (
      <div className="p-6">
        <LoadingFallback
          title="Loading Templates"
          description="Verifying your admin permissions..."
          onRefresh={() => window.location.reload()}
        />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">Authentication Required</h3>
            <Button onClick={() => router.push('/login')}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (userProfile && !isAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">Admin Access Required</h3>
            <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin')} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Admin
        </Button>
        <BookTemplate className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Request Templates</h1>
          <p className="text-gray-600">Create reusable bundles of fields and documents</p>
        </div>
      </div>

      <TemplatesManager />
    </div>
  )
}
