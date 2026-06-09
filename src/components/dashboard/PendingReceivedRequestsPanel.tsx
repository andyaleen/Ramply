'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowRight, Clock, FileText } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { fetchReceivedShareRequests } from '@/lib/recipient-requests'

/**
 * Pending share requests sent to the signed-in user, shown on the Send Requests page.
 */
export function PendingReceivedRequestsPanel() {
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const { data: requests = [], isLoading, error, refetch } = useQuery({
    queryKey: ['pending-received-requests-panel', user?.email],
    queryFn: async () => {
      const all = await fetchReceivedShareRequests(supabase, user?.email)
      return all.filter((request) => request.status === 'pending')
    },
    enabled: !!user?.email,
  })

  return (
    <Card id="pending-requests">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-yellow-600" />
          Pending Requests
        </CardTitle>
        <CardDescription>
          Share requests from partners and vendors waiting for your response
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
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
            <FileText className="h-10 w-10 mb-3" />
            <p>No pending requests right now.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type of Request</TableHead>
                <TableHead>Fields / Docs</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Received</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{request.request_type}</TableCell>
                  <TableCell className="text-sm">
                    {request.mandatory_fields.length} required, {request.optional_fields.length} optional fields
                    <br />
                    {request.mandatory_documents.length} required, {request.optional_documents.length} optional docs
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1 w-fit">
                      <Clock className="h-3 w-3" />
                      Pending
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(request.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => router.push('/onboard/' + request.token)}
                    >
                      <ArrowRight className="h-4 w-4 mr-1" />
                      Complete
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
