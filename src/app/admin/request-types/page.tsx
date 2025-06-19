'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { OnboardingTypesList } from '@/components/dashboard/OnboardingTypesList'
import { CreateOnboardingTypeDialog } from '@/components/dashboard/CreateOnboardingTypeDialog'
import { LoadingFallback } from '@/components/LoadingFallback'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, ArrowLeft, Settings, BarChart3 } from 'lucide-react'
import { useState } from 'react'

export default function RequestTypesPage() {
  const { user, userProfile, loading, isAdmin } = useAuth()
  const router = useRouter()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  useEffect(() => {
    // Only log when there are actual state changes
    if (!loading) {
      if (!user) {
        console.log('❌ RequestTypesPage: No user found, redirecting to /login')
        router.push('/login')
      } else if (user && userProfile && userProfile.contact_name !== 'Profile Load Timeout' && !isAdmin) {
        console.log('❌ RequestTypesPage: User is not admin, redirecting to /dashboard. Role:', userProfile?.role)
        router.push('/dashboard')
      } else if (user && userProfile && userProfile.contact_name !== 'Profile Load Timeout' && isAdmin) {
        console.log('✅ RequestTypesPage: Admin access confirmed. Role:', userProfile?.role)
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
          title="Loading Request Types"
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
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              You need to be logged in to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // If user is not admin
  if (!loading && user && userProfile && !isAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You need administrator privileges to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/dashboard')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // If we're still loading profile data
  if (!loading && user && !userProfile) {
    return (
      <div className="p-6">
        <LoadingFallback 
          title="Loading Profile"
          description="Setting up your admin access..."
          onRefresh={() => window.location.reload()}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.push('/admin')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Onboarding Request Types
                </h1>
                <p className="text-sm text-gray-600">
                  Manage your onboarding flows and requirements
                </p>
              </div>
            </div>            <div className="flex items-center space-x-4">
              <Button 
                variant="outline"
                onClick={() => {
                  // TODO: Implement analytics/reporting
                  alert('Analytics feature coming soon!')
                }}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  // TODO: Implement global settings
                  alert('Global settings coming soon!')
                }}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create New Type
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <Card>            <CardHeader>
              <CardTitle>Manage Onboarding Types</CardTitle>
              <CardDescription>
                Create, edit, and manage different types of onboarding flows. Configure required fields, documents, and workflows for each type.
              </CardDescription>
            </CardHeader><CardContent>
              <OnboardingTypesList mode="manage" />
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Create Dialog */}
      <CreateOnboardingTypeDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleCreateSuccess}
      />
    </div>
  )
}
