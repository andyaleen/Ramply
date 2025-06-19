'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingFallback } from '@/components/LoadingFallback'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Users, Plus, Send, Mail } from 'lucide-react'
import { OnboardingTypesList } from '@/components/dashboard/OnboardingTypesList'
import { CreateOnboardingTypeDialog } from '@/components/dashboard/CreateOnboardingTypeDialog'

export default function SendLinksPage() {
  const { user, userProfile, loading, isAdmin } = useAuth()
  const router = useRouter()
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  useEffect(() => {
    // Only log when there are actual state changes
    if (!loading) {
      if (!user) {
        console.log('❌ SendLinksPage: No user found, redirecting to /login')
        router.push('/login')
      } else if (user && userProfile && userProfile.contact_name !== 'Profile Load Timeout' && !isAdmin) {
        console.log('❌ SendLinksPage: User is not admin, redirecting to /dashboard. Role:', userProfile?.role)
        router.push('/dashboard')
      } else if (user && userProfile && userProfile.contact_name !== 'Profile Load Timeout' && isAdmin) {
        console.log('✅ SendLinksPage: Admin access confirmed. Role:', userProfile?.role)
      }
    }
  }, [user, loading, router, isAdmin, userProfile])

  const handleCreateSuccess = () => {
    setShowCreateDialog(false)
  }

  // Show loading spinner while loading auth state or if we have a timeout fallback
  if (loading || (userProfile?.contact_name === 'Profile Load Timeout')) {
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

  // If not loading but no user - show a friendly message before redirect happens
  if (!loading && !user) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
            <p className="text-gray-600 text-center mb-4">
              Please sign in to access the send links feature
            </p>
            <Button onClick={() => router.push('/login')}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show message for non-admin users while redirect happens
  if (!loading && user && userProfile && userProfile.contact_name !== 'Profile Load Timeout' && !isAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Admin Access Required</h3>
            <p className="text-gray-600 text-center mb-4">
              You need admin privileges to access the send links feature
            </p>
            <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}      <div className="flex items-center justify-between">        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/admin')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Button>
          <Send className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Send Onboarding Links</h1>
            <p className="text-gray-600">Send personalized onboarding invitations to vendors and partners</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={() => {
              // TODO: Implement bulk send feature
              alert('Bulk send feature coming soon!')
            }}
          >
            <Mail className="h-4 w-4 mr-2" />
            Bulk Send
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create New Type
          </Button>
        </div>
      </div>      {/* Onboarding Types */}
      <Card>
        <CardHeader>
          <CardTitle>Available Onboarding Types</CardTitle>
          <CardDescription>
            Choose an onboarding type below to send personalized invitations. Each invitation includes the required fields and documents for that specific type.
          </CardDescription>
        </CardHeader><CardContent>
          <OnboardingTypesList mode="send" />
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <CreateOnboardingTypeDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleCreateSuccess}
      />
    </div>
  )
}
