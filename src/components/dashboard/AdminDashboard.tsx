'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Settings, Users, FileText, Link, Crown, Send } from 'lucide-react'
import { OnboardingTypesList } from '@/components/dashboard/OnboardingTypesList'
import { OnboardingRequestsList } from '@/components/dashboard/OnboardingRequestsList'
import { CreateOnboardingTypeDialog } from '@/components/dashboard/CreateOnboardingTypeDialog'
import { UserManagement } from '@/components/dashboard/UserManagement'
import { useState, useEffect } from 'react'
import { DashboardService, DashboardStats } from '@/lib/services/dashboard'

export function AdminDashboard() {
  const { user, userProfile, isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalOnboardingTypes: 0,
    pendingRequests: 0,
    completedThisMonth: 0,
    totalVendors: 0
  })
  const [loading, setLoading] = useState(true)
  // Handle authentication checks
  useEffect(() => {
    // Don't do anything while auth is still loading
    if (authLoading) {
      return
    }

    // If no user after auth loading is complete, redirect to login
    if (!user) {
      console.log('AdminDashboard: No user found after auth loading, redirecting to login')
      router.push('/login')
      return
    }

    // If user exists but no profile yet, wait for profile to load
    if (!userProfile) {
      return
    }

    // If user is not admin, redirect to regular dashboard
    if (!isAdmin) {
      console.log('AdminDashboard: User is not admin, redirecting to dashboard. Role:', userProfile.role)
      router.push('/dashboard')
      return
    }

    // Only log once when admin access is confirmed
    if (isAdmin && userProfile.role === 'admin') {
      console.log('AdminDashboard: Admin user confirmed')
    }
  }, [authLoading, user, userProfile, isAdmin, router])
  useEffect(() => {
    const dashboardService = new DashboardService()
    
    const loadDashboardStats = async () => {
      // Only load stats if we have an authenticated admin user
      if (!user || !userProfile || !isAdmin || authLoading) {
        console.log('AdminDashboard: Skipping stats load - missing requirements', {
          hasUser: !!user,
          hasProfile: !!userProfile,
          isAdmin,
          authLoading
        })
        return
      }
      
      try {
        console.log('AdminDashboard: Loading dashboard stats for user:', user)
        setLoading(true)
        const stats = await dashboardService.getDashboardStats(user)
        console.log('AdminDashboard: Loaded stats:', stats)
        setDashboardStats(stats)
      } catch (error) {
        console.error('Error loading dashboard stats:', error)
        // Set default values on error
        setDashboardStats({
          totalOnboardingTypes: 0,
          pendingRequests: 0,
          completedThisMonth: 0,
          totalVendors: 0
        })
      } finally {
        setLoading(false)
      }
    }

    loadDashboardStats()
  }, [user, userProfile, isAdmin, authLoading])

  const handleCreateSuccess = () => {
    setShowCreateDialog(false)
    // Refresh stats when new onboarding type is created
    refreshDashboardStats()
  }
  
  const refreshDashboardStats = async () => {
    if (!user) return
    
    const dashboardService = new DashboardService()
    try {
      console.log('AdminDashboard: Refreshing dashboard stats')
      setLoading(true)
      const stats = await dashboardService.getDashboardStats(user)
      console.log('AdminDashboard: Refreshed stats:', stats)
      setDashboardStats(stats)
    } catch (error) {
      console.error('Error refreshing dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  // Show loading screen while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  // Show loading screen while waiting for user profile
  if (user && !userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user profile...</p>
        </div>
      </div>
    )
  }

  // If no user or not admin, the useEffect will handle redirects
  // Show a brief loading state to prevent flash
  if (!user || !userProfile || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    )
  }
  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {userProfile?.contact_name || 'Admin'}!
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your onboarding flows and track vendor submissions
            </p>
          </div>
        </div>
      </header>      {/* Main Content */}
      <main className="flex-1 p-6 bg-gray-50">
        {/* Quick Stats */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Dashboard Overview</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshDashboardStats}
              disabled={loading}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
              ) : (
                <Settings className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Onboarding Types</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? (
                  <div className="animate-pulse bg-gray-200 h-8 w-12 rounded"></div>
                ) : (
                  dashboardStats.totalOnboardingTypes
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Active onboarding flows
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? (
                  <div className="animate-pulse bg-gray-200 h-8 w-12 rounded"></div>
                ) : (
                  dashboardStats.pendingRequests
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Awaiting completion
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed This Month</CardTitle>
              <Link className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? (
                  <div className="animate-pulse bg-gray-200 h-8 w-12 rounded"></div>
                ) : (
                  dashboardStats.completedThisMonth
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Successful onboardings
              </p>            </CardContent>
          </Card>
        </div>
        </div>{/* Quick Actions */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
          </div>
          <div className="flex gap-4 flex-wrap">
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Onboarding Flow
            </Button>
            <Button variant="outline" onClick={() => router.push('/admin/send-links')}>
              <Send className="h-4 w-4 mr-2" />
              Send Links
            </Button>
            <Button variant="outline" onClick={() => router.push('/admin/responses')}>
              <FileText className="h-4 w-4 mr-2" />
              View Responses
            </Button>
            <Button variant="outline" onClick={() => router.push('/admin/request-types')}>
              <Settings className="h-4 w-4 mr-2" />
              Manage Types
            </Button>
          </div>
        </div>

        {/* Admin Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="dashboard">
              <FileText className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="users">
              <Crown className="h-4 w-4 mr-2" />
              User Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            {/* Onboarding Types */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Your Onboarding Types</h3>
                <OnboardingTypesList />
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Requests</h3>
                <OnboardingRequestsList />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>        
          </Tabs>
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
