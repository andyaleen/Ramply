'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowRight, Clock, FileText, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface DashboardStats {
  pending: number
  completedThisMonth: number
  totalCompleted: number
}

/**
 * Fetch share-request stats for the current company (outgoing requests).
 * Returns zero counts when no company is loaded yet.
 */
function useDashboardStats(companyId: string | undefined) {
  const supabase = createClient()

  return useQuery<DashboardStats>({
    queryKey: ['dashboard-stats', companyId],
    queryFn: async () => {
      if (!companyId) return { pending: 0, completedThisMonth: 0, totalCompleted: 0 }

      const now = new Date()
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const [{ data: pending }, { data: completed }, { data: thisMonth }] = await Promise.all([
        supabase.from('share_requests').select('id').eq('requester_company_id', companyId).eq('status', 'pending'),
        supabase.from('share_requests').select('id').eq('requester_company_id', companyId).eq('status', 'completed'),
        supabase.from('share_requests').select('id').eq('requester_company_id', companyId).eq('status', 'completed').gte('completed_at', firstOfMonth),
      ])

      return {
        pending: pending?.length ?? 0,
        completedThisMonth: thisMonth?.length ?? 0,
        totalCompleted: completed?.length ?? 0,
      }
    },
    enabled: !!companyId,
  })
}

export function Dashboard() {
  const { company, profileLoading } = useAuth()
  const router = useRouter()
  const { data: stats, isLoading: statsLoading } = useDashboardStats(company?.id)

  if (profileLoading) {
    return (
      <div className="flex-1 p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Welcome back, {company?.contact_name || 'there'}
        </h1>
        <p className="text-muted-foreground mt-1">
          Send share requests to partners and track vendor submissions in one place.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard
          label="Pending Requests"
          value={stats?.pending ?? 0}
          caption="Awaiting completion"
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          loading={statsLoading}
        />
        <StatCard
          label="Completed This Month"
          value={stats?.completedThisMonth ?? 0}
          caption="Successful this month"
          icon={<FileText className="h-4 w-4 text-muted-foreground" />}
          loading={statsLoading}
        />
        <StatCard
          label="Total Completed"
          value={stats?.totalCompleted ?? 0}
          caption="All-time completed"
          icon={<FileText className="h-4 w-4 text-muted-foreground" />}
          loading={statsLoading}
        />
      </section>

      <section>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick actions</h2>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => router.push('/dashboard/send-links')} className="group">
            <Send className="h-4 w-4 mr-2" />
            Send share request
            <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-0.5" />
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard/responses')}>
            <FileText className="h-4 w-4 mr-2" />
            View responses
          </Button>
        </div>
      </section>

      <RequestsReceivedCard />
    </div>
  )
}

interface StatCardProps {
  label: string
  value: number
  caption: string
  icon: React.ReactNode
  loading: boolean
}

function StatCard({ label, value, caption, icon, loading }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-12" /> : <div className="text-2xl font-bold">{value}</div>}
        <p className="text-xs text-muted-foreground mt-1">{caption}</p>
      </CardContent>
    </Card>
  )
}

/**
 * Inline card linking to requests the user has received from other companies.
 * Provides a secondary surface for recipients without dominating the dashboard.
 */
function RequestsReceivedCard() {
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const { data: pendingReceived = 0, isLoading } = useQuery<number>({
    queryKey: ['pending-received', user?.email],
    queryFn: async () => {
      if (!user?.email) return 0
      const { data, error } = await supabase
        .from('share_requests')
        .select('id')
        .eq('status', 'pending')
      if (error) throw error
      return (data ?? []).length
    },
    enabled: !!user?.email,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Requests sent to you</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? 'Checking for new share requests…'
              : pendingReceived > 0
                ? `You have ${pendingReceived} pending ${pendingReceived === 1 ? 'request' : 'requests'} to respond to.`
                : 'You have no pending requests from other companies right now.'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/requests')}>
          View
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  )
}
