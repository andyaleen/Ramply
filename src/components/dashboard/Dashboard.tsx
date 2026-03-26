'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CheckCircle, Clock, FileText, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import type { ShareRequestRow } from '@/lib/database.types'

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending:   { label: 'Pending',   className: 'bg-yellow-100 text-yellow-800' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-800' },
  expired:   { label: 'Expired',   className: 'bg-red-100 text-red-800' },
}

type RecipientRequest = Pick<
  ShareRequestRow,
  'id' | 'token' | 'mandatory_fields' | 'optional_fields' | 'mandatory_documents' | 'optional_documents' | 'status' | 'created_at' | 'completed_at'
>

export function Dashboard() {
  const { user, company } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const { data: requests = [], isLoading } = useQuery<RecipientRequest[]>({
    queryKey: ['recipient-requests', user?.email],
    queryFn: async () => {
      if (!user?.email) return []
      const { data, error } = await supabase
        .from('share_requests')
        .select('id, token, mandatory_fields, optional_fields, mandatory_documents, optional_documents, status, created_at, completed_at')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as RecipientRequest[]
    },
    enabled: !!user?.email,
  })

  const pending = requests.filter((r) => r.status === 'pending').length
  const completed = requests.filter((r) => r.status === 'completed').length

  return (
    <div className="flex-1 p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {company?.contact_name || 'there'}!
        </h1>
        <p className="text-gray-600 mt-1">View and respond to share requests from your partners</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '-' : requests.length}</div>
            <p className="text-xs text-muted-foreground">Requests received</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '-' : pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting your response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '-' : completed}</div>
            <p className="text-xs text-muted-foreground">Successfully submitted</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Share Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse h-10 bg-gray-100 rounded" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-gray-500">
              <FileText className="h-10 w-10 mb-3" />
              <p>No share requests yet. You will receive an email when someone requests your information.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fields / Docs</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => {
                  const badge = STATUS_BADGE[r.status] ?? STATUS_BADGE.pending
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm text-gray-600">
                        {r.mandatory_fields.length} required, {r.optional_fields.length} optional fields<br />
                        {r.mandatory_documents.length} required, {r.optional_documents.length} optional docs
                      </TableCell>
                      <TableCell>
                        <Badge className={badge.className}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {r.completed_at ? formatDate(r.completed_at) : formatDate(r.created_at)}
                      </TableCell>
                      <TableCell>
                        {r.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => router.push('/onboard/' + r.token)}
                            className="flex items-center gap-1"
                          >
                            <ArrowRight className="h-4 w-4" />
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
