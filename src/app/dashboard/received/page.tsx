'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileText, XCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import {
  fetchCompletedReceivedShareRequests,
  fetchReceivedShareRequests,
  type CompletedReceivedShareRequest,
} from '@/lib/recipient-requests'
import { ReceivedSubmissionDialog } from '@/components/dashboard/ReceivedSubmissionDialog'

export default function RequestsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [selectedRequest, setSelectedRequest] = useState<CompletedReceivedShareRequest | null>(null)

  const { data: allRequests = [], isLoading: statsLoading } = useQuery({
    queryKey: ['recipient-requests-page', user?.email],
    queryFn: async () => fetchReceivedShareRequests(supabase, user?.email),
    enabled: !!user?.email,
  })

  const {
    data: completedRequests = [],
    isLoading: tableLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['completed-received-requests', user?.email],
    queryFn: async () => fetchCompletedReceivedShareRequests(supabase, user?.email),
    enabled: !!user?.email,
  })

  const isLoading = statsLoading || tableLoading

  const stats = {
    pending: allRequests.filter((r) => r.status === 'pending').length,
    completed: completedRequests.length,
    expired: allRequests.filter((r) => r.status === 'expired').length,
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Received</h1>
        <p className="text-muted-foreground">Completed share requests you submitted for partners and vendors</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card
          className="cursor-pointer transition-colors hover:bg-muted/50"
          onClick={() => router.push('/dashboard/send-links#pending-requests')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <div className="h-8 bg-gray-200 rounded w-12 animate-pulse" /> : stats.pending}
            </div>
          </CardContent>
        </Card>
        {[
          { label: 'Completed', value: stats.completed },
          { label: 'Expired', value: stats.expired },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? <div className="h-8 bg-gray-200 rounded w-12 animate-pulse" /> : value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-600" />
            <div>
              <p className="font-medium text-red-800">Failed to load requests</p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Completed Requests</CardTitle>
          <CardDescription>Share requests you have already completed</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : completedRequests.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-gray-500">
              <FileText className="h-10 w-10 mb-3" />
              <p>No completed requests yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Received date</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.companyName ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {request.requesterEmail || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(request.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedRequest(request)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ReceivedSubmissionDialog
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
      />
    </div>
  )
}
