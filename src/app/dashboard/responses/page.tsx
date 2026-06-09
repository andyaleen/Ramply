'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { OnboardingResponsesList } from '@/components/dashboard/OnboardingResponsesList'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ResponseStats {
  total: number
  thisMonth: number
  uniqueVendors: number
}

export default function ResponsesPage() {
  const { company, profileLoading } = useAuth()

  const { data: stats, isLoading: statsLoading } = useQuery<ResponseStats>({
    queryKey: ['response-stats', company?.id],
    queryFn: async () => {
      if (!company) return { total: 0, thisMonth: 0, uniqueVendors: 0 }
      const supabase = createClient()

      const now = new Date()
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const [{ data: all }, { data: monthly }] = await Promise.all([
        supabase
          .from('share_requests')
          .select('request_type')
          .eq('requester_company_id', company.id)
          .eq('status', 'completed'),
        supabase
          .from('share_requests')
          .select('id')
          .eq('requester_company_id', company.id)
          .eq('status', 'completed')
          .gte('completed_at', firstOfMonth),
      ])

      const uniqueVendors = new Set((all ?? []).map((r) => r.request_type)).size
      return {
        total: all?.length ?? 0,
        thisMonth: monthly?.length ?? 0,
        uniqueVendors,
      }
    },
    enabled: !!company,
  })

  if (profileLoading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">Loading Responses</h3>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Responses</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading
              ? <div className="animate-pulse bg-gray-200 h-8 w-12 rounded" />
              : <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
            }
            <p className="text-xs text-muted-foreground">All completed submissions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading
              ? <div className="animate-pulse bg-gray-200 h-8 w-12 rounded" />
              : <div className="text-2xl font-bold">{stats?.thisMonth ?? 0}</div>
            }
            <p className="text-xs text-muted-foreground">Responses this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Request Types</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading
              ? <div className="animate-pulse bg-gray-200 h-8 w-12 rounded" />
              : <div className="text-2xl font-bold">{stats?.uniqueVendors ?? 0}</div>
            }
            <p className="text-xs text-muted-foreground">Distinct request types with completed responses</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Share Requests</CardTitle>
          <CardDescription>
            View submitted field data, declined requests, and download shared documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingResponsesList />
        </CardContent>
      </Card>
    </div>
  )
}
