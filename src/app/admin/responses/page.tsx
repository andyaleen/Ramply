'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { OnboardingResponsesList } from '@/components/dashboard/OnboardingResponsesList'
import { LoadingFallback } from '@/components/LoadingFallback'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Users, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ResponsesPage() {
  const { user, userProfile, loading, isAdmin } = useAuth()
  const router = useRouter()
  const [totalResponseThisMonth, setTotalResponseThisMonth] = useState<Number>(0)
  const [totalResponses, setTotalResponses] = useState<Number>(0)
  const [totalUniqueVendors, setTotalUniqueVendors] = useState<Number>(0)
  const [loadingResponses, setLoadingResponses] = useState<boolean>(false)

  useEffect(() => {
    // Only log when there are actual state changes
    if (!loading) {
      if (!user) {
        console.log('❌ ResponsesPage: No user found, redirecting to /login')
        router.push('/login')
      } else if (user && userProfile && userProfile.contact_name !== 'Profile Load Timeout' && !isAdmin) {
        console.log('❌ ResponsesPage: User is not admin, redirecting to /dashboard. Role:', userProfile?.role)
        router.push('/dashboard')
      } else if (user && userProfile && userProfile.contact_name !== 'Profile Load Timeout' && isAdmin) {
        console.log('✅ ResponsesPage: Admin access confirmed. Role:', userProfile?.role)
      }
    }
  }, [user, loading, router, isAdmin, userProfile])

  console.log("user", user)

  //supabase query for fetching Total Onboardings
  useEffect(() => {
    setLoadingResponses(true)
    async function totalOnboardingUser() {
      try {
        const supabase = createClient()
        const { count, error } = await supabase.from("onboarding_requests").select('*', { count: 'exact' }).eq('requester_user_id', '28d8a73f-3776-4f03-a4f4-1bb1e77188d2')
        setTotalResponses(count || 0)
        setTotalUniqueVendors(count || 0)
        setTotalResponseThisMonth(count || 0)
        setLoadingResponses(false)
      if(error){
          throw new Error("something went wrong while fetching total request")
      }
      }
      catch (error: any) {
        console.error("Error while finding onboarding users", error)
        setLoadingResponses(false)
      } finally {
        setLoadingResponses(false)
      }
    }

    totalOnboardingUser()

  }, [])
  // Show loading spinner while loading auth state or if we have a timeout fallback
  if (loading || (userProfile?.contact_name === 'Profile Load Timeout')) {
    return (
      <div className="p-6">
        <LoadingFallback
          title="Loading Responses"
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
              Please sign in to view onboarding responses
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
              You need admin privileges to view onboarding responses
            </p>
            <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Onboarding Responses</h1>
            <p className="text-gray-600">View and manage completed onboarding submissions</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
                {loadingResponses ? <div className="animate-pulse bg-gray-200 h-8 w-12 rounded"></div> : <div className="text-2xl font-bold">
              {totalResponses}
            </div>}
            </div>
            <p className="text-xs text-muted-foreground">All completed submissions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingResponses ? <div className="animate-pulse bg-gray-200 h-8 w-12 rounded"></div> : <div className="text-2xl font-bold">
              {totalResponseThisMonth}
            </div>}
            <p className="text-xs text-muted-foreground">Responses this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Vendors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
                {loadingResponses ? <div className="animate-pulse bg-gray-200 h-8 w-12 rounded"></div> : <div className="text-2xl font-bold">
              {totalUniqueVendors}
            </div>}
            <p className="text-xs text-muted-foreground">Total unique respondents</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Completed Onboarding Responses</CardTitle>
          <CardDescription>
            View detailed information about completed onboarding submissions including documents and form data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingResponsesList />
        </CardContent>
      </Card>
    </div>
  )
}
