'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'

const serifTitle = "font-['Instrument_Serif',serif] tracking-tight"

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

/**
 * Main dashboard surface. Warm-gray page background, Instrument Serif
 * welcome header, three accent-striped stat cards, quick actions, and
 * an empty-state "Requests sent to you" card.
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
    <div className="flex-1 bg-[#F0EFE9] p-6 md:p-10 space-y-10 font-['DM_Sans',sans-serif]">
      <header>
        <h1 className={`${serifTitle} text-[30px] leading-tight text-[#0F1F18] font-normal`}>
          Welcome back, {company?.contact_name || 'there'}
        </h1>
        <p className="mt-2 text-[14px] font-light text-[#7A8C84]">
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
        />
        <StatCard
          label="Completed This Month"
          value={stats?.completedThisMonth ?? 0}
          description="Successful this month"
          loading={statsLoading}
          icon={<DocumentCheckIcon />}
        />
        <StatCard
          label="Total Completed"
          value={stats?.totalCompleted ?? 0}
          description="All-time completed"
          loading={statsLoading}
          icon={<DocumentIcon />}
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

interface StatCardProps {
  label: string
  value: number
  description: string
  icon: React.ReactNode
  loading: boolean
  highlighted?: boolean
}

/**
 * Stat card with a top accent stripe, icon badge, and Instrument Serif
 * metric. The first card (Pending Requests) uses the deep green stripe;
 * the others use the light green accent.
 */
function StatCard({ label, value, description, icon, loading, highlighted }: StatCardProps) {
  const stripeColor = highlighted ? '#287253' : '#E8F2ED'
  return (
    <div className="relative overflow-hidden bg-white border border-[#DDDCD5] rounded-xl p-6">
      <div
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ backgroundColor: stripeColor }}
      />
      <div className="flex items-start justify-between">
        <p className="text-[13px] text-[#7A8C84]">{label}</p>
        <div className="h-8 w-8 rounded-lg bg-[#E8F2ED] text-[#287253] flex items-center justify-center">
          {icon}
        </div>
      </div>
      <div className="mt-4">
        {loading ? (
          <Skeleton className="h-10 w-16" />
        ) : (
          <p className={`${serifTitle} text-[38px] leading-none text-[#0F1F18]`}>{value}</p>
        )}
      </div>
      <p className="mt-2 text-[12px] font-light text-[#7A8C84]">{description}</p>
    </div>
  )
}

/**
 * "Requests sent to you" card with a centered empty state when no pending
 * requests exist. Links to /dashboard/requests when there are items.
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
    <section>
      <div className="bg-white border border-[#DDDCD5] rounded-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DDDCD5]">
          <h3 className="text-[14px] font-medium text-[#0F1F18]">Requests sent to you</h3>
          <button
            type="button"
            onClick={() => router.push('/dashboard/requests')}
            className="text-[13px] text-[#287253] hover:underline"
          >
            View →
          </button>
        </div>
        <div className="px-6 py-12 flex flex-col items-center text-center">
          <div className="h-10 w-10 rounded-lg bg-[#E8F2ED] text-[#287253] flex items-center justify-center">
            <DocumentIcon />
          </div>
          <p className="mt-4 text-[14px] font-light text-[#7A8C84] max-w-sm">
            {isLoading
              ? 'Checking for new share requests…'
              : pendingReceived > 0
                ? `You have ${pendingReceived} pending ${pendingReceived === 1 ? 'request' : 'requests'} to respond to.`
                : 'You have no pending requests from other companies right now.'}
          </p>
        </div>
      </div>
    </section>
  )
}

/* --- Icons (inline SVG) --- */

function ClockIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
      <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6v4l2.5 2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function DocumentCheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
      <path
        d="M6 2.5h5l4 4V16a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 015 16V4a1.5 1.5 0 011-1.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M11 2.5v4h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8 11.5l1.75 1.75L13 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function DocumentIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
      <path
        d="M6 2.5h5l4 4V16a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 015 16V4a1.5 1.5 0 011-1.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M11 2.5v4h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8 10h4M8 13h3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
