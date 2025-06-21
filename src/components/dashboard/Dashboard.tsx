'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, LogOut, Users, FileText, Link } from 'lucide-react'
import { ExternalOnboardingTypesList } from '@/components/dashboard/ExternalOnboardingTypesList'
import { ExternalRequestsList } from '@/components/dashboard/ExternalRequestsList'
import { useState, useEffect } from 'react'
import { DashboardService, DashboardStats } from '@/lib/services/dashboard'


export function Dashboard() {
  const { user, userProfile } = useAuth()
  const router = useRouter()
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalOnboardingTypes: 0,
    pendingRequests: 0,
    completedThisMonth: 0,
    totalVendors: 0
  })
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const dashboardService = new DashboardService()
    
    const loadDashboardStats = async () => {
      if (!user) return
      
      try {
        setLoading(true)
        const stats = await dashboardService.getExternalUserStats(user)
        console.log('Dashboard stats loaded:', stats)
        setDashboardStats(stats)
      } catch (error) {
        console.error('Error loading dashboard stats:', error)      } finally {
        setLoading(false)
      }
    }
    
    loadDashboardStats()
  }, [user])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div className="ml-3">
                <h1 className="text-xl font-semibold text-gray-900">Onbo</h1>
                <p className="text-sm text-gray-600">{userProfile?.company_name}</p>
              </div>
            </div>
              <div className="flex items-center space-x-4">          
              <Button variant="ghost" size="sm" onClick={() => router.push('/signout')}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Welcome back, {userProfile?.contact_name || 'there'}!
          </h2>
          <p className="text-gray-600 mt-2">
            View your onboarding requests and track submission status
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Onboarding Requests</CardTitle>
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
                Total requests received
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
                Awaiting your response
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
                Successfully completed
              </p>
            </CardContent>
          </Card>        
          </div>

        {/* Onboarding Types */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Available Onboarding Types</h3>
            <ExternalOnboardingTypesList />
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Your Requests</h3>
            <ExternalRequestsList />
          </div>        
          </div>
      </main>
    </div>
  )
}
