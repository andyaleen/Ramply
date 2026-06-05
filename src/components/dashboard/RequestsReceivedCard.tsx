'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { DocumentIcon } from '@/components/dashboard/DashboardStatCard'
import { fetchPendingReceivedShareRequests } from '@/lib/recipient-requests'
import { formatDate } from '@/lib/utils'

/**
 * "Requests sent to you" card with pending request rows and review actions.
 */
export function RequestsReceivedCard() {
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const { data: pendingRequests = [], isLoading } = useQuery({
    queryKey: ['pending-received-requests', user?.email],
    queryFn: async () => fetchPendingReceivedShareRequests(supabase, user?.email),
    enabled: !!user?.email,
  })

  return (
    <section>
      <div className="bg-white border border-[#DDDCD5] rounded-xl overflow-hidden">
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

        {isLoading ? (
          <div className="px-6 py-6 space-y-3">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="h-14 rounded-lg bg-[#F0EFE9] animate-pulse" />
            ))}
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="px-6 py-12 flex flex-col items-center text-center">
            <div className="h-10 w-10 rounded-lg bg-[#E8F2ED] text-[#287253] flex items-center justify-center">
              <DocumentIcon />
            </div>
            <p className="mt-4 text-[14px] font-light text-[#7A8C84] max-w-sm">
              You have no pending requests from other companies right now.
            </p>
          </div>
        ) : (
          <ul className="max-h-[420px] overflow-y-auto divide-y divide-[#DDDCD5]">
            {pendingRequests.map((request) => (
              <li key={request.id}>
                <div className="flex items-center justify-between gap-4 px-6 py-4">
                  <button
                    type="button"
                    onClick={() => router.push(`/onboard/${request.token}`)}
                    className="min-w-0 flex-1 text-left hover:opacity-80 transition-opacity"
                  >
                    <p className="text-[14px] font-medium text-[#0F1F18] truncate">
                      {request.requesterName}
                    </p>
                    <p className="mt-1 text-[13px] font-light text-[#7A8C84] truncate">
                      {request.request_type} · Received {formatDate(request.created_at)}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/onboard/${request.token}`)}
                    className="shrink-0 rounded-lg border border-[#DDDCD5] bg-white px-4 py-2 text-[13px] font-medium text-[#287253] hover:bg-[#F0EFE9] transition-colors"
                  >
                    Review
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
