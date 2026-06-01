'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Clock, FileText, Plus, Send } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { documentTypeLabel, fieldLabel } from '@/lib/catalog'
import { formatDate, formatExpirationHint, isExpiringSoon } from '@/lib/utils'
import type { ShareRequestRow } from '@/lib/database.types'

type PendingSentRequest = Pick<
  ShareRequestRow,
  | 'id'
  | 'request_type'
  | 'recipient_email'
  | 'mandatory_fields'
  | 'optional_fields'
  | 'mandatory_documents'
  | 'optional_documents'
  | 'expires_at'
  | 'created_at'
>

/** Load outgoing share requests that are still waiting on recipient completion. */
function usePendingSentRequests(companyId: string | undefined) {
  const supabase = createClient()

  return useQuery<PendingSentRequest[]>({
    queryKey: ['pending-sent-requests', companyId],
    queryFn: async () => {
      if (!companyId) return []

      const { data, error } = await supabase
        .from('share_requests')
        .select('id, request_type, recipient_email, mandatory_fields, optional_fields, mandatory_documents, optional_documents, expires_at, created_at')
        .eq('requester_company_id', companyId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as PendingSentRequest[]
    },
    enabled: !!companyId,
  })
}

export default function PendingRequestsPage() {
  const { company, profileLoading } = useAuth()
  const router = useRouter()
  const { data: requests = [], isLoading, error, refetch } = usePendingSentRequests(company?.id)

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <Send className="h-8 w-8 text-[#287253]" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pending Sent Requests</h1>
            <p className="text-gray-600">Share requests you sent that have not been completed yet</p>
          </div>
        </div>
        <Button onClick={() => router.push('/dashboard/send-links')} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Request
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Awaiting Completion</CardTitle>
          <CardDescription>
            Track who still needs to submit company information and documents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PendingRequestsContent
            error={error}
            isLoading={isLoading || profileLoading}
            requests={requests}
            onRetry={() => refetch()}
            onCreate={() => router.push('/dashboard/send-links')}
          />
        </CardContent>
      </Card>
    </div>
  )
}

/** Render the pending request loading, error, empty, and table states. */
function PendingRequestsContent({
  error,
  isLoading,
  requests,
  onRetry,
  onCreate,
}: {
  error: unknown
  isLoading: boolean
  requests: PendingSentRequest[]
  onRetry: () => void
  onCreate: () => void
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 rounded bg-gray-100 animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <FileText className="mb-3 h-10 w-10 text-red-400" />
        <h3 className="mb-2 text-lg font-medium">Failed to load pending requests</h3>
        <Button variant="outline" size="sm" onClick={onRetry}>Try Again</Button>
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-center text-gray-500">
        <Clock className="mb-3 h-10 w-10" />
        <h3 className="mb-2 text-lg font-medium text-gray-900">No Pending Sent Requests</h3>
        <p className="mb-4 max-w-md">Requests you send will appear here until the recipient completes them.</p>
        <Button onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Request
        </Button>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Recipient</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Requested</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Sent</TableHead>
          <TableHead>Expires</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((request) => (
          <TableRow key={request.id}>
            <TableCell className="font-medium">{request.recipient_email || 'No email captured'}</TableCell>
            <TableCell>{request.request_type}</TableCell>
            <TableCell className="max-w-md whitespace-normal text-sm text-muted-foreground">
              <RequestSelections request={request} />
            </TableCell>
            <TableCell>
              <Badge className="w-fit bg-yellow-100 text-yellow-800">
                <Clock className="mr-1 h-3 w-3" />
                Pending
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{formatDate(request.created_at)}</TableCell>
            <TableCell className="text-sm">
              <span className={isExpiringSoon(request.expires_at) ? 'font-medium text-amber-700' : 'text-muted-foreground'}>
                {formatExpirationHint(request.expires_at)}
              </span>
              {request.expires_at && (
                <span className="block text-xs text-muted-foreground">{formatDate(request.expires_at)}</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/** Summarize requested fields and documents with human-readable labels. */
function RequestSelections({ request }: { request: PendingSentRequest }) {
  const fields = [...request.mandatory_fields, ...request.optional_fields].map(fieldLabel)
  const documents = [...request.mandatory_documents, ...request.optional_documents].map(documentTypeLabel)

  return (
    <div className="space-y-1">
      <p>{fields.length} fields, {documents.length} documents</p>
      <p className="line-clamp-2">
        {[...fields, ...documents].join(', ') || 'No selections'}
      </p>
    </div>
  )
}
