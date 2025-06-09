'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { analyticsService } from '@/lib/services/analytics'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Area, AreaChart 
} from 'recharts'
import { 
  Users, FileText, 
  AlertCircle, BarChart3, Target, Award 
} from 'lucide-react'

const CHART_COLORS = {
  primary: '#3b82f6',
  secondary: '#ef4444', 
  tertiary: '#f59e0b',
  quaternary: '#10b981',
  accent: '#8b5cf6'
}

export default function AnalyticsPage() {
  const { user } = useAuth()

  // Check for potential schema errors
  const hasSchemaError = false // We'll implement this if needed

  const { 
    data: analyticsData, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['analytics-data', user?.id],
    queryFn: () => analyticsService.getAnalyticsData(user!),
    enabled: !!user && !hasSchemaError,
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please log in to view analytics.</p>
        </div>
      </div>
    )
  }

  if (hasSchemaError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Database Schema Error</h2>
          <p className="text-gray-600 mb-4">
            There seems to be an issue with the database schema. Please check the{' '}
            <a href="/debug" className="underline font-medium">debug page</a> for more details.
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Analytics</h2>
          <p className="text-red-700 mb-4">
            {error instanceof Error ? error.message : 'There was an error loading your analytics data. Please try refreshing the page.'}
          </p>
          <button 
            onClick={() => refetch()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into your onboarding performance
          </p>
        </div>

        {/* Loading Overview Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Loading Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Analytics Data</h2>
          <p className="text-gray-600">No analytics data available yet. Start creating onboarding flows to see insights.</p>
        </div>
      </div>
    )
  }

  const { 
    overviewStats, 
    completionTrends, 
    onboardingTypePerformance, 
    vendorStatusDistribution,
    documentAnalytics,
    recentCompletions,
    timeToComplete
  } = analyticsData

  // Prepare chart data
  const trendChartData = completionTrends.map(trend => ({
    date: new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    completed: trend.completed,
    pending: trend.pending,
    expired: trend.expired
  }))

  const pieChartData = vendorStatusDistribution.map((item, index) => ({
    name: item.status,
    value: item.count,
    percentage: item.percentage,
    color: Object.values(CHART_COLORS)[index % Object.keys(CHART_COLORS).length]
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Comprehensive insights into your onboarding performance
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewStats.totalRequests}</div>
            <p className="text-xs text-muted-foreground">
              {overviewStats.completedRequests} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewStats.averageCompletionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Average across all types
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Vendors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewStats.totalVendors}</div>
            <p className="text-xs text-muted-foreground">
              Unique vendor contacts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents Uploaded</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewStats.totalDocumentsUploaded}</div>
            <p className="text-xs text-muted-foreground">
              Total submissions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Tabs */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Completion Trends</TabsTrigger>
          <TabsTrigger value="performance">Type Performance</TabsTrigger>
          <TabsTrigger value="status">Status Distribution</TabsTrigger>
          <TabsTrigger value="documents">Document Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Completion Trends</CardTitle>
                <CardDescription>
                  Daily completion patterns over the last 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="completed" 
                      stackId="1"
                      stroke={CHART_COLORS.quaternary} 
                      fill={CHART_COLORS.quaternary}
                      fillOpacity={0.6}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="pending" 
                      stackId="1"
                      stroke={CHART_COLORS.tertiary} 
                      fill={CHART_COLORS.tertiary}
                      fillOpacity={0.6}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="expired" 
                      stackId="1"
                      stroke={CHART_COLORS.secondary} 
                      fill={CHART_COLORS.secondary}
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Time to Complete</CardTitle>
                <CardDescription>
                  Average completion time analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Average</span>
                    <span className="text-sm">{timeToComplete.averageDays} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Fastest</span>
                    <span className="text-sm text-green-600">{timeToComplete.fastest} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Slowest</span>
                    <span className="text-sm text-red-600">{timeToComplete.slowest} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Median</span>
                    <span className="text-sm">{timeToComplete.median} days</span>
                  </div>
                  
                  <div className="mt-6">
                    <h4 className="text-sm font-medium mb-3">Distribution</h4>
                    <div className="space-y-2">
                      {timeToComplete.distribution?.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{item.range}</span>
                          <span>{item.count} requests</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Onboarding Type Performance</CardTitle>
              <CardDescription>
                Performance metrics for each onboarding type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {onboardingTypePerformance.map((type) => (
                  <div key={type.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-medium">{type.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {type.totalRequests} total requests
                        </p>
                      </div>
                      <Badge variant={type.completionRate >= 70 ? 'default' : 'secondary'}>
                        {type.completionRate}% completion
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Completed</span>
                        <p className="font-medium text-green-600">{type.completedRequests}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Pending</span>
                        <p className="font-medium text-yellow-600">{type.pendingRequests}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Expired</span>
                        <p className="font-medium text-red-600">{type.expiredRequests}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Avg. Time</span>
                        <p className="font-medium">
                          {type.averageTimeToComplete ? `${type.averageTimeToComplete} days` : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Status Distribution</CardTitle>
                <CardDescription>
                  Breakdown of request statuses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} (${percentage}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status Breakdown</CardTitle>
                <CardDescription>
                  Detailed status statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {vendorStatusDistribution.map((status, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: pieChartData[index]?.color }}
                        />
                        <span className="font-medium">{status.status}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{status.count}</div>
                        <div className="text-sm text-muted-foreground">{status.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Document Analytics</CardTitle>
                <CardDescription>
                  Document upload statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Total Documents</span>
                      <p className="text-2xl font-bold">{documentAnalytics.totalDocuments}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Avg. per Request</span>
                      <p className="text-2xl font-bold">{documentAnalytics.averageDocumentsPerRequest}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    <div>
                      <span className="text-sm text-muted-foreground">Today</span>
                      <p className="font-medium">{documentAnalytics.documentsUploadedToday}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">This Week</span>
                      <p className="font-medium">{documentAnalytics.documentsUploadedThisWeek}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">This Month</span>
                      <p className="font-medium">{documentAnalytics.documentsUploadedThisMonth}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Completions</CardTitle>
                <CardDescription>
                  Latest completed onboarding requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentCompletions.slice(0, 5).map((completion) => (
                    <div key={completion.id} className="flex justify-between items-start p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{completion.vendorName}</p>
                        <p className="text-sm text-muted-foreground">{completion.onboardingTypeName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(completion.completedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{completion.timeToComplete}</p>
                        <p className="text-xs text-muted-foreground">
                          {completion.documentsSubmitted} docs
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
