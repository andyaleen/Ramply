'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowRight, CheckCircle, Clock, FileText, XCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { ShareRequestRow } from '@/lib/database.types'

const STATUS_BADGE: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  pending:   { label: 'Pending',   className: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" /> },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-800',  icon: <CheckCircle className="h-3 w-3" /> },
  expired:   { label: 'Expired',   className: 'bg-red-100 text-red-800',      icon: <XCircle className="h-3 w-3" /> },
}

type RecipientRequest = Pick<
  ShareRequestRow,
  'id' | 'token' | 'request_type' | 'mandatory_fields' | 'optional_fields' | 'mandatory_documents' | 'optional_documents' | 'status' | 'created_at' | 'completed_at'
>

export default function RequestsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const { data: requests = [], isLoading, error, refetch } = useQuery<RecipientRequest[]>({
    queryKey: ['recipient-requests-page', user?.email],
    queryFn: async () => {
      if (!user?.email) return []
      const { data, error } = await supabase
        .from('share_requests')
        .select('id, token, request_type, mandatory_fields, optional_fields, mandatory_documents, optional_documents, status, created_at, completed_at')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as RecipientRequest[]
    },
    enabled: !!user?.email,
  })

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    completed: requests.filter((r) => r.status === 'completed').length,
    expired: requests.filter((r) => r.status === 'expired').length,
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Share Requests</h1>
        <p className="text-muted-foreground">Share requests sent to you by partners and vendors</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Total', value: stats.total },
          { label: 'Pending', value: stats.pending },
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
          <CardTitle>All Requests</CardTitle>
          <CardDescription>Complete pending requests to share your company information</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-gray-500">
              <FileText className="h-10 w-10 mb-3" />
              <p>No share requests yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type of Request</TableHead>
                  <TableHead>Fields / Docs</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => {
                  const badge = STATUS_BADGE[r.status] ?? STATUS_BADGE.pending
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.request_type}</TableCell>
                      <TableCell className="text-sm">
                        {r.mandatory_fields.length} required, {r.optional_fields.length} optional fields<br />
                        {r.mandatory_documents.length} required, {r.optional_documents.length} optional docs
                      </TableCell>
                      <TableCell>
                        <Badge className={badge.className + ' flex items-center gap-1 w-fit'}>
                          {badge.icon}
                          {badge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(r.created_at)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.completed_at ? formatDate(r.completed_at) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {r.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => router.push('/onboard/' + r.token)}
                          >
                            <ArrowRight className="h-4 w-4 mr-1" />
                            Complete
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
