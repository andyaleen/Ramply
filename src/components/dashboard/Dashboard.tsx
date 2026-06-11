'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'
import { ClockIcon, StatCard } from '@/components/dashboard/DashboardStatCard'
import { RequestsReceivedCard } from '@/components/dashboard/RequestsReceivedCard'

const pageTitle = 'text-[30px] font-semibold leading-tight text-[#0F1F18]'

interface DashboardStats {
  pending: number
  completedThisMonth: number
  totalCompleted: number
}

/**
 * Fetch share-request stats for the current company (outgoing requests).
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

/**
 * Main dashboard surface for outgoing requests, quick actions, and received requests.
 */
export function Dashboard() {
  const { company, profileLoading } = useAuth()
  const router = useRouter()
  const { data: stats, isLoading: statsLoading } = useDashboardStats(company?.id)

  if (profileLoading) {
    return (
      <div className="flex-1 bg-[#F0EFE9] p-6 md:p-10 space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-[#F0EFE9] p-6 md:p-10 space-y-10">
      <header>
        <h1 className={pageTitle}>
          Welcome back, {company?.contact_name || 'there'}
        </h1>
        <p className="mt-2 text-[14px] text-[#7A8C84]">
          Send share requests to partners and track vendor submissions in one place.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Pending Requests"
          value={stats?.pending ?? 0}
          description="Awaiting completion"
          highlighted
          loading={statsLoading}
          icon={<ClockIcon />}
          onClick={() => router.push('/dashboard/send-links')}
        />
        <StatCard
          label="Completed This Month"
          value={stats?.completedThisMonth ?? 0}
          description="Successful this month"
          loading={statsLoading}
        />
        <StatCard
          label="Total Completed"
          value={stats?.totalCompleted ?? 0}
          description="All-time completed"
          loading={statsLoading}
        />
      </section>

      <section>
        <h2 className="text-[15px] font-medium text-[#0F1F18] mb-4">Quick actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard/send-links')}
            className="bg-[#287253] hover:bg-[#1A4D38] transition-colors text-white rounded-lg px-5 py-2.5 text-sm font-medium inline-flex items-center gap-2"
          >
            Send share request
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
              <path
                d="M4 10h12m0 0l-4-4m4 4l-4 4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard/responses')}
            className="bg-white hover:bg-[#F0EFE9] transition-colors border border-[#DDDCD5] text-[#4A5C54] rounded-lg px-5 py-2.5 text-sm inline-flex items-center gap-2"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
              <path
                d="M6 3h6l4 4v10a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M12 3v4h4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            View responses
          </button>
        </div>
      </section>

      <RequestsReceivedCard />
    </div>
  )
}
