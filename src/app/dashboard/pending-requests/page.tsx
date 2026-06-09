'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Send } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { PendingSentRequestsPanel } from '@/components/dashboard/PendingSentRequestsPanel'

export default function PendingRequestsPage() {
  const { profileLoading } = useAuth()
  const router = useRouter()

  if (profileLoading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="h-10 w-72 animate-pulse rounded bg-gray-100" />
        <div className="h-64 animate-pulse rounded bg-gray-100" />
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <Send className="h-8 w-8 text-[#287253]" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pending Sent Requests</h1>
            <p className="text-gray-600">Share requests you sent that have not been completed yet</p>
          </div>
        </div>
        <Button
          onClick={() => router.push('/dashboard/send-links')}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Request
        </Button>
      </div>

      <PendingSentRequestsPanel onCreateRequest={() => router.push('/dashboard/send-links')} />
    </div>
  )
}
