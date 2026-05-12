'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { DocumentIcon } from '@/components/dashboard/DashboardStatCard'

/**
 * "Requests sent to you" card with a centered empty state and received route link.
 */
export function RequestsReceivedCard() {
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
            onClick={() => router.push('/dashboard/received')}
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
              ? 'Checking for new share requests...'
              : pendingReceived > 0
                ? `You have ${pendingReceived} pending ${pendingReceived === 1 ? 'request' : 'requests'} to respond to.`
                : 'You have no pending requests from other companies right now.'}
          </p>
        </div>
      </div>
    </section>
  )
}
