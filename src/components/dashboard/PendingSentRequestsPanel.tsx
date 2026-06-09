'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Clock, FileText, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { documentTypeLabel, fieldLabel } from '@/lib/catalog'
import { formatDate, formatExpirationHint, isExpiringSoon } from '@/lib/utils'
import {
  fetchPendingSentShareRequests,
  type PendingSentRequest,
} from '@/lib/requester-pending-requests'

interface PendingSentRequestsPanelProps {
  onCreateRequest?: () => void
}

/**
 * Outgoing share requests awaiting recipient completion (matches dashboard pending count).
 */
export function PendingSentRequestsPanel({ onCreateRequest }: PendingSentRequestsPanelProps) {
  const { company } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()

  const { data: requests = [], isLoading, error, refetch } = useQuery({
    queryKey: ['pending-sent-requests', company?.id],
    queryFn: async () => fetchPendingSentShareRequests(supabase, company?.id),
    enabled: !!company?.id,
  })

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

  function handleCancel(request: PendingSentRequest) {
    const recipient = request.recipient_email || 'this recipient'
    const confirmed = window.confirm(`Cancel the pending request sent to ${recipient}?`)
    if (!confirmed) return
    cancelMutation.mutate(request.id)
  }

  return (
    <Card id="pending-requests">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-yellow-600" />
          Pending Requests
        </CardTitle>
        <CardDescription>
          Share requests you sent that are still waiting for recipients to complete
        </CardDescription>
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
            <p className="mb-4">No pending requests right now.</p>
            {onCreateRequest ? (
              <Button onClick={onCreateRequest}>
                <Plus className="mr-2 h-4 w-4" />
                Create Request
              </Button>
            ) : null}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">
                    {request.recipient_email || 'No email captured'}
                  </TableCell>
                  <TableCell>{request.request_type}</TableCell>
                  <TableCell className="max-w-md whitespace-normal text-sm text-muted-foreground">
                    <RequestSelections request={request} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(request.created_at)}
                  </TableCell>
                  <TableCell className="text-sm">
                    <span
                      className={
                        isExpiringSoon(request.expires_at)
                          ? 'font-medium text-amber-700'
                          : 'text-muted-foreground'
                      }
                    >
                      {formatExpirationHint(request.expires_at)}
                    </span>
                    {request.expires_at ? (
                      <span className="block text-xs text-muted-foreground">
                        {formatDate(request.expires_at)}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
                      disabled={cancelMutation.isPending}
                      onClick={() => handleCancel(request)}
                    >
                      Cancel
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function RequestSelections({ request }: { request: PendingSentRequest }) {
  const fields = [...request.mandatory_fields, ...request.optional_fields].map(fieldLabel)
  const documents = [...request.mandatory_documents, ...request.optional_documents].map(
    documentTypeLabel
  )

  return (
    <div className="space-y-1">
      <p>
        {fields.length} fields, {documents.length} documents
      </p>
      <p className="line-clamp-2">{[...fields, ...documents].join(', ') || 'No selections'}</p>
    </div>
  )
}
