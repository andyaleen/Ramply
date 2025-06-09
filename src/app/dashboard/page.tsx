'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, FileText, Users, CheckCircle, Clock, Building2, MoreVertical, AlertCircle } from 'lucide-react'
import { CreateOnboardingTypeDialog } from '@/components/dashboard/CreateOnboardingTypeDialog'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '@/lib/services/dashboard'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function DashboardPage() {
  const { userProfile, user } = useAuth()
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  // Check for schema error
  const hasSchemaError = userProfile?.contact_name === 'Schema Error - Please Fix Database'

  // Fetch dashboard data
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: () => dashboardService.getDashboardStats(user!),
    enabled: !!user && !hasSchemaError,
    retry: 2,
  })

  const { data: onboardingTypes, isLoading: typesLoading, error: typesError } = useQuery({
    queryKey: ['dashboard-onboarding-types', user?.id],
    queryFn: () => dashboardService.getOnboardingTypesWithStats(user!),
    enabled: !!user && !hasSchemaError,
    retry: 2,
  })

  const { data: recentActivity, isLoading: activityLoading, error: activityError } = useQuery({
    queryKey: ['dashboard-activity', user?.id],
    queryFn: () => dashboardService.getRecentActivity(user!),
    enabled: !!user && !hasSchemaError,
    retry: 2,
  })

  // Loading states
  const isLoading = statsLoading || typesLoading || activityLoading
  const hasError = statsError || typesError || activityError

  // Stats configuration
  const statsConfig = [
    {
      title: "Total Onboarding Types",
      value: stats?.totalOnboardingTypes || 0,
      icon: FileText,
      description: "Active flows"
    },
    {
      title: "Pending Requests",
      value: stats?.pendingRequests || 0,
      icon: Clock,
      description: "Awaiting completion"
    },
    {
      title: "Completed This Month",
      value: stats?.completedThisMonth || 0,
      icon: CheckCircle,
      description: "Successfully processed"
    },
    {
      title: "Total Vendors",
      value: stats?.totalVendors || 0,
      icon: Users,
      description: "Registered vendors"
    }
  ]
  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Schema Error Banner */}
      {hasSchemaError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-red-100 p-2 rounded-full">
                <Building2 className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-800">Database Schema Error</h3>                <p className="text-sm text-red-700 mt-1">
                  The users table has the wrong schema. Please visit the{' '}
                  <a href="/debug" className="underline font-medium">debug page</a>{' '}
                  and use the &quot;Fix Schema&quot; button for instructions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>      )}

      {/* Error State */}
      {hasError && !hasSchemaError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-red-100 p-2 rounded-full">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-800">Error Loading Dashboard</h3>
                <p className="text-sm text-red-700 mt-1">
                  There was an error loading your dashboard data. Please try refreshing the page.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>          
          <p className="text-muted-foreground">
            Welcome back, {userProfile?.contact_name || 'there'}! Here&apos;s what&apos;s happening with your onboarding flows.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} disabled={hasSchemaError}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Flow
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsConfig.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? (
                  <div className="h-8 bg-gray-200 rounded w-12 animate-pulse"></div>
                ) : (
                  stat.value
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>      {/* Onboarding Types Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Onboarding Types</h2>
            <p className="text-muted-foreground">
              Manage your onboarding flows and track their performance
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Create New Card */}
            <Card 
              className="border-dashed border-2 hover:border-primary/50 cursor-pointer transition-colors" 
              onClick={() => setShowCreateDialog(true)}
            >
              <CardContent className="flex flex-col items-center justify-center p-6 text-center min-h-[200px]">
                <div className="rounded-full bg-primary/10 p-3 mb-4">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="mb-2">Create New Flow</CardTitle>
                <CardDescription>
                  Set up a new onboarding process for your vendors or employees
                </CardDescription>
              </CardContent>
            </Card>

            {/* Existing Onboarding Types */}
            {onboardingTypes?.map((type) => (
              <Card key={type.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg">{type.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {type.description || "No description provided"}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Duplicate</DropdownMenuItem>
                        <DropdownMenuItem>View Requests</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={type.totalRequests > 0 ? 'default' : 'secondary'}>
                      {type.totalRequests > 0 ? 'active' : 'inactive'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Created {new Date(type.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Total Requests</p>
                      <p className="text-2xl font-bold">{type.totalRequests}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Completed</p>
                      <p className="text-2xl font-bold text-green-600">{type.completedRequests}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Completion Rate</span>
                      <span>{type.completionRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ 
                          width: `${type.completionRate}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Empty State */}
            {onboardingTypes?.length === 0 && (
              <div className="col-span-full">
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No onboarding types yet</h3>
                    <p className="text-gray-600 text-center mb-4">
                      Create your first onboarding flow to start collecting vendor information
                    </p>
                    <Button onClick={() => setShowCreateDialog(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Flow
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>      
      {/* Recent Activity */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-6">Recent Activity</h2>
        <Card>
          <CardContent className="p-6">
            {activityLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-4 rounded-lg border animate-pulse">
                    <div className="rounded-full bg-gray-200 p-2 w-10 h-10"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                ))}
              </div>
            ) : recentActivity && recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-4 p-4 rounded-lg border">
                    <div className={`rounded-full p-2 ${
                      activity.status === 'completed' ? 'bg-green-100 text-green-600' :
                      activity.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                      activity.status === 'in-progress' ? 'bg-blue-100 text-blue-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {activity.status === 'completed' ? <CheckCircle className="h-4 w-4" /> :
                       activity.status === 'pending' ? <Clock className="h-4 w-4" /> :
                       activity.status === 'in-progress' ? <FileText className="h-4 w-4" /> :
                       <Building2 className="h-4 w-4" />
                      }
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.type}
                        {activity.details && ` • ${activity.details}`}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {activity.time}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No recent activity</h3>
                <p className="text-gray-600 text-center">
                  Activity will appear here as you create onboarding flows and receive requests
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Dialog */}
      <CreateOnboardingTypeDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => setShowCreateDialog(false)}
      />
    </div>
  )
}
