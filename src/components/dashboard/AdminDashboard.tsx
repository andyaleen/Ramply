'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, Users, Send, Crown } from 'lucide-react'
import { UserManagement } from '@/components/dashboard/UserManagement'
import { createClient } from '@/lib/supabase/client'

interface AdminStats {
  pending: number
  completedThisMonth: number
  totalCompleted: number
}

export function AdminDashboard() {
  const { company, profileLoading } = useAuth()
  const router = useRouter()

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['admin-stats', company?.id],
    queryFn: async () => {
      if (!company) return { pending: 0, completedThisMonth: 0, totalCompleted: 0 }
      const supabase = createClient()
      const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

      const [{ data: pending }, { data: completed }, { data: thisMonth }] = await Promise.all([
        supabase.from('share_requests').select('id').eq('requester_company_id', company.id).eq('status', 'pending'),
        supabase.from('share_requests').select('id').eq('requester_company_id', company.id).eq('status', 'completed'),
        supabase.from('share_requests').select('id').eq('requester_company_id', company.id).eq('status', 'completed').gte('completed_at', firstOfMonth),
      ])

      return {
        pending: pending?.length ?? 0,
        completedThisMonth: thisMonth?.length ?? 0,
        totalCompleted: completed?.length ?? 0,
      }
    },
    enabled: !!company,
  })

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {company?.contact_name || 'Admin'}!
        </h1>
        <p className="text-gray-600 mt-1">Manage share requests and track vendor submissions</p>
      </header>

      <main className="flex-1 p-6 bg-gray-50 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading
                ? <div className="animate-pulse bg-gray-200 h-8 w-12 rounded" />
                : <div className="text-2xl font-bold">{stats?.pending ?? 0}</div>
              }
              <p className="text-xs text-muted-foreground">Awaiting completion</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed This Month</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading
                ? <div className="animate-pulse bg-gray-200 h-8 w-12 rounded" />
                : <div className="text-2xl font-bold">{stats?.completedThisMonth ?? 0}</div>
              }
              <p className="text-xs text-muted-foreground">Successful this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Completed</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading
                ? <div className="animate-pulse bg-gray-200 h-8 w-12 rounded" />
                : <div className="text-2xl font-bold">{stats?.totalCompleted ?? 0}</div>
              }
              <p className="text-xs text-muted-foreground">All-time completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="flex gap-4 flex-wrap">
            <Button onClick={() => router.push('/admin/send-links')}>
              <Send className="h-4 w-4 mr-2" />
              Send Share Request
            </Button>
            <Button variant="outline" onClick={() => router.push('/admin/responses')}>
              <FileText className="h-4 w-4 mr-2" />
              View Responses
            </Button>
          </div>
        </div>

        {/* Admin Tabs */}
        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">
              <Crown className="h-4 w-4 mr-2" />
              User Management
            </TabsTrigger>
          </TabsList>
          <TabsContent value="users">
            <UserManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
