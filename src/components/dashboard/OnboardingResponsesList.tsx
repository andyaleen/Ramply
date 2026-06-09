'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CheckCircle, Clock, Download, Eye, FileText } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { downloadDocument } from '@/lib/file-utils'
import { fieldLabel, documentTypeLabel } from '@/lib/catalog'
import {
  fetchShareRequestsForRequester,
  fetchSharedDocumentsForRequester,
  fetchSharedRecipientCompanies,
  resolveCompleterEmail,
  resolveRecipientCompanyLabel,
} from '@/lib/requester-share-responses'
import type { ShareRequestRow, SharedDataRow, CompanyDocumentRow, CompanyRow } from '@/lib/database.types'

type ShareResponse = Omit<ShareRequestRow, 'token'> & {
  sharedData: SharedDataRow | null
  sharedDocs: CompanyDocumentRow[]
  recipientCompany: CompanyRow | null
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-800' },
  expired: { label: 'Expired', className: 'bg-red-100 text-red-800' },
  denied: { label: 'Declined', className: 'bg-red-100 text-red-800' },
}

export function OnboardingResponsesList() {
  const { company } = useAuth()
  const supabase = createClient()
  const [selected, setSelected] = useState<ShareResponse | null>(null)

  const { data: responses = [], isLoading, error } = useQuery<ShareResponse[]>({
    queryKey: ['share-responses', company?.id],
    queryFn: async () => {
      if (!company) return []

      const requests = await fetchShareRequestsForRequester(supabase, company.id)
      if (!requests.length) return []

      const ids = requests.map((r) => r.id)
      const companyIds = requests
        .map((r) => r.completed_by_company_id ?? r.denied_by_company_id)
        .filter((id): id is string => Boolean(id))

      const [{ data: sharedDataRows }, sharedDocLinks, companyRows] = await Promise.all([
        supabase.from('shared_data').select('*').in('share_request_id', ids),
        fetchSharedDocumentsForRequester(supabase, ids),
        fetchSharedRecipientCompanies(supabase, companyIds),
      ])

      return requests.map((req) => ({
        ...req,
        sharedData: sharedDataRows?.find((d) => d.share_request_id === req.id) ?? null,
        sharedDocs: sharedDocLinks
          .filter((link) => link.share_request_id === req.id)
          .map((link) => link.document),
        recipientCompany:
          companyRows.find(
            (row) => row.id === (req.completed_by_company_id ?? req.denied_by_company_id)
          ) ?? null,
      }))
    },
    enabled: !!company,
  })

  const companyLabel = useMemo(() => {
    return (row: ShareResponse) =>
      resolveRecipientCompanyLabel(row.recipientCompany, row.sharedData, row.recipient_email)
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-lg font-medium mb-2">Error Loading Responses</h3>
          <p className="text-gray-600">Failed to load share requests. Please try again.</p>
        </CardContent>
      </Card>
    )
  }

  if (!responses.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium mb-2">No Responses Yet</h3>
          <p className="text-gray-600">
            Completed and declined share requests will appear here once recipients respond.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type of Request</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {responses.map((r) => {
            const badge = STATUS_BADGE[r.status] ?? STATUS_BADGE.pending
            return (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.request_type}</TableCell>
                <TableCell className="text-sm">
                  {r.recipientCompany?.id ? (
                    <Button
                      variant="link"
                      className="h-auto p-0 text-sm"
                      onClick={() => {
                        window.location.href = `/dashboard/responses/${r.recipientCompany?.id}`
                      }}
                    >
                      {companyLabel(r)}
                    </Button>
                  ) : (
                    <span className="text-gray-500">{r.recipient_email ?? 'Unknown'}</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {resolveCompleterEmail(r.recipient_email, r.sharedData)}
                </TableCell>
                <TableCell>
                  <Badge className={badge.className}>{badge.label}</Badge>
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  {r.denied_at
                    ? formatDate(r.denied_at)
                    : r.completed_at
                      ? formatDate(r.completed_at)
                      : formatDate(r.created_at)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelected(r)}
                    className="flex items-center gap-1"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <ResponseDetailsDialog response={selected} onClose={() => setSelected(null)} />
    </>
  )
}

/** Dialog showing submitted field values and shared documents for a single share request. */
function ResponseDetailsDialog({
  response,
  onClose,
}: {
  response: ShareResponse | null
  onClose: () => void
}) {
  if (!response) return null

  const companyName = resolveRecipientCompanyLabel(
    response.recipientCompany,
    response.sharedData,
    response.recipient_email
  )

  const requiredFieldEntries = response.sharedData
    ? response.mandatory_fields.map((key) => ({
        key,
        label: fieldLabel(key),
        value: response.sharedData!.field_data[key] ?? '-',
      }))
    : []

  const optionalFieldEntries = response.sharedData
    ? response.optional_fields.map((key) => ({
        key,
        label: fieldLabel(key),
        value: response.sharedData!.field_data[key] ?? '-',
      }))
    : []

  const sharedDocsByType = new Map(
    response.sharedDocs.map((doc) => [doc.document_type, doc])
  )

  return (
    <Dialog open={!!response} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share Request - {response.request_type}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardContent className="py-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Company</p>
                <p className="text-sm font-medium">{companyName}</p>
              </div>
              {response.completed_by_company_id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.location.href = `/dashboard/responses/${response.completed_by_company_id}`
                  }}
                >
                  View Assets
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Pending / expired state */}
          {response.status === 'denied' && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="py-6 flex items-center gap-3 text-red-700">
                <Clock className="h-5 w-5 shrink-0" />
                <p className="text-sm">
                  {companyName} declined this request
                  {response.recipient_email ? ` (${response.recipient_email})` : ''}.
                  No information was shared.
                </p>
              </CardContent>
            </Card>
          )}

          {response.status !== 'completed' && response.status !== 'denied' && (
            <Card>
              <CardContent className="py-6 flex items-center gap-3 text-gray-500">
                <Clock className="h-5 w-5 shrink-0" />
                <p className="text-sm">
                  {response.status === 'expired'
                    ? 'This request expired before the recipient responded.'
                    : 'Waiting for the recipient to complete this request.'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Submitted field data */}
          {(requiredFieldEntries.length > 0 || optionalFieldEntries.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Submitted Information</CardTitle>
              </CardHeader>
              <CardContent>
                {requiredFieldEntries.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-2">Required</p>
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                      {requiredFieldEntries.map(({ key, label, value }) => (
                        <div key={key}>
                          <dt className="text-xs font-medium text-gray-500">{label}</dt>
                          <dd className="mt-0.5 text-sm">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
                {optionalFieldEntries.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Optional</p>
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                      {optionalFieldEntries.map(({ key, label, value }) => (
                        <div key={key}>
                          <dt className="text-xs font-medium text-gray-500">{label}</dt>
                          <dd className="mt-0.5 text-sm">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Shared documents */}
          {(response.mandatory_documents.length > 0 || response.optional_documents.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Shared Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {response.mandatory_documents.map((docType) => {
                  const doc = sharedDocsByType.get(docType)
                  return (
                    <div key={docType} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{documentTypeLabel(docType)}</p>
                        <p className="text-xs text-gray-500">Required</p>
                        {doc && (
                          <p className="text-xs text-gray-500">
                            {doc.file_name} • {formatDate(doc.uploaded_at)}
                          </p>
                        )}
                      </div>
                      {doc ? (
                        <Button variant="outline" size="sm" onClick={() => downloadDocument(doc)}>
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      ) : (
                        <Badge variant="destructive" className="text-xs">Missing</Badge>
                      )}
                    </div>
                  )
                })}
                {response.optional_documents.map((docType) => {
                  const doc = sharedDocsByType.get(docType)
                  return (
                    <div key={docType} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{documentTypeLabel(docType)}</p>
                        <p className="text-xs text-gray-500">Optional</p>
                        {doc && (
                          <p className="text-xs text-gray-500">
                            {doc.file_name} • {formatDate(doc.uploaded_at)}
                          </p>
                        )}
                      </div>
                      {doc ? (
                        <Button variant="outline" size="sm" onClick={() => downloadDocument(doc)}>
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      ) : (
                        <Badge variant="outline" className="text-xs">Not provided</Badge>
                      )}
                    </div>
                  )}
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
