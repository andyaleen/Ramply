'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Clock, FileText, Search } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import {
  PENDING_REQUEST_STATUS_CLASSES,
  PENDING_REQUEST_STATUS_LABELS,
  resolvePendingRequestDisplayStatus,
} from '@/lib/pending-request-status'
import { filterPendingSentRequests } from '@/lib/pending-request-search'
import { PendingRequestActionMenu } from '@/components/dashboard/PendingRequestActionMenu'
import {
  fetchPendingSentShareRequests,
  type PendingSentRequest,
} from '@/lib/requester-pending-requests'

/**
 * Outgoing share requests awaiting recipient completion (matches dashboard pending count).
 */
export function PendingSentRequestsPanel() {
  const { company } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')

  const { data: requests = [], isLoading, error, refetch } = useQuery({
    queryKey: ['pending-sent-requests', company?.id],
    queryFn: async () => fetchPendingSentShareRequests(supabase, company?.id),
    enabled: !!company?.id,
  })

  const filteredRequests = useMemo(
    () => filterPendingSentRequests(requests, searchQuery),
    [requests, searchQuery]
  )

  const cancelMutation = useMutation({
    mutationFn: async (shareRequestId: string) => {
      const response = await fetch('/api/share-requests/cancel', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ share_request_id: shareRequestId }),
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to cancel request')
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pending-sent-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }),
      ])
      toast.success('Request cancelled')
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const remindMutation = useMutation({
    mutationFn: async (shareRequestId: string) => {
      const response = await fetch('/api/share-requests/remind', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ share_request_id: shareRequestId }),
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to send reminder')
      }
    },
    onSuccess: (_data, shareRequestId) => {
      const request = requests.find((item) => item.id === shareRequestId)
      const recipient = request?.recipient_email || 'the recipient'
      toast.success(`Reminder sent to ${recipient}`)
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  function isActingOnRequest(requestId: string) {
    return (
      (cancelMutation.isPending && cancelMutation.variables === requestId)
      || (remindMutation.isPending && remindMutation.variables === requestId)
    )
  }

  function handleRemind(request: PendingSentRequest) {
    remindMutation.mutate(request.id)
  }

  function handleCancel(request: PendingSentRequest) {
    const recipient = request.recipient_email || 'this recipient'
    const confirmed = window.confirm(`Cancel the pending request sent to ${recipient}?`)
    if (!confirmed) return
    cancelMutation.mutate(request.id)
  }

  return (
    <Card id="pending-requests">
      <CardHeader className="gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            Pending Requests
          </CardTitle>
          <CardDescription>
            Share requests you sent that are still waiting for recipients to complete
          </CardDescription>
        </div>
        {!isLoading && !error && requests.length > 0 ? (
          <div className="relative w-full sm:w-72 sm:shrink-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search email, company, type, date…"
              className="pl-9"
              aria-label="Search pending requests"
            />
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 rounded bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-8 text-center">
            <p className="mb-3 text-sm text-muted-foreground">Failed to load pending requests</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-gray-500">
            <FileText className="mb-3 h-10 w-10" />
            <p>No pending requests right now.</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-gray-500">
            <Search className="mb-3 h-10 w-10" />
            <p>No pending requests match your search.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {filteredRequests.map((request) => {
                const status = resolvePendingRequestDisplayStatus(request)
                return (
                  <div key={request.id} className="rounded-lg border bg-card p-4 space-y-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium break-all">
                        {request.recipient_email || 'No email captured'}
                      </p>
                      <p className="text-sm text-muted-foreground">{request.request_type}</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Sent</p>
                        <p className="text-sm">{formatDate(request.created_at)}</p>
                      </div>
                      <Badge className={PENDING_REQUEST_STATUS_CLASSES[status]}>
                        {PENDING_REQUEST_STATUS_LABELS[status]}
                      </Badge>
                    </div>
                    <PendingRequestActionMenu
                      request={request}
                      disabled={isActingOnRequest(request.id)}
                      onRemind={handleRemind}
                      onCancel={handleCancel}
                      className="w-full"
                    />
                  </div>
                )
              })}
            </div>

            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => {
                    const status = resolvePendingRequestDisplayStatus(request)
                    return (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">
                          {request.recipient_email || 'No email captured'}
                        </TableCell>
                        <TableCell>{request.request_type}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(request.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge className={PENDING_REQUEST_STATUS_CLASSES[status]}>
                            {PENDING_REQUEST_STATUS_LABELS[status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <PendingRequestActionMenu
                            request={request}
                            disabled={isActingOnRequest(request.id)}
                            onRemind={handleRemind}
                            onCancel={handleCancel}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
