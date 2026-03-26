'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingFallback } from '@/components/LoadingFallback'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Users, Plus, Send } from 'lucide-react'
import { SendOnboardingRequestDialog } from '@/components/dashboard/SendOnboardingRequestDialog'

export default function SendLinksPage() {
  const { user, userProfile, loading, isAdmin } = useAuth()
  const router = useRouter()
  const [showDialog, setShowDialog] = useState(false)

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
          title="Loading Send Links"
          description="Verifying your admin permissions..."
          onRefresh={() => window.location.reload()}
        />
      </div>
    )
  }

  if (!loading && !user) {
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

  if (!loading && user && userProfile && !isAdmin) {
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin')} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Button>
          <Send className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Send Share Requests</h1>
            <p className="text-gray-600">Request company information and documents from vendors and partners</p>
          </div>
        </div>
        <Button onClick={() => setShowDialog(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Request
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How it works</CardTitle>
          <CardDescription>
            Click <strong>New Request</strong> to select the information fields and documents you need from a recipient.
            They&apos;ll receive an email with a secure link to share their company profile with you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setShowDialog(true)} size="lg">
            <Plus className="h-4 w-4 mr-2" />
            Create Share Request
          </Button>
        </CardContent>
      </Card>

      <SendOnboardingRequestDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        onSuccess={() => setShowDialog(false)}
      />
    </div>
  )
}

