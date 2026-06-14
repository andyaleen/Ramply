'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CheckCircle, ChevronDown, Clock, Download, FileDown, FileText, Loader2, Paperclip } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { downloadDocument } from '@/lib/file-utils'
import { documentTypeLabel } from '@/lib/catalog'
import { buildResponseDetailViewModel } from '@/lib/response-detail-view-model'
import { downloadResponseAttachments, downloadResponsePdf } from '@/lib/export-response-pdf'
import { toast } from 'sonner'
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

/** Pick the most relevant timestamp for display in the list. */
function responseDisplayDate(response: ShareResponse): string {
  if (response.denied_at) return formatDate(response.denied_at)
  if (response.completed_at) return formatDate(response.completed_at)
  return formatDate(response.created_at)
}

interface ResponseCompanyNameProps {
  response: ShareResponse
  label: string
  className?: string
}

/** Company name with optional link to the recipient profile. */
function ResponseCompanyName({ response, label, className }: ResponseCompanyNameProps) {
  if (response.recipientCompany?.id) {
    return (
      <Button
        variant="link"
        className={`h-auto p-0 text-sm font-medium ${className ?? ''}`}
        onClick={() => {
          window.location.href = `/dashboard/responses/${response.recipientCompany?.id}`
        }}
      >
        {label}
      </Button>
    )
  }

  return <span className={`font-medium text-gray-900 ${className ?? ''}`}>{label}</span>
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
      <div className="space-y-3 md:hidden">
        {responses.map((response) => {
          const badge = STATUS_BADGE[response.status] ?? STATUS_BADGE.pending
          const label = companyLabel(response)
          const email = resolveCompleterEmail(response.recipient_email, response.sharedData)

          return (
            <div key={response.id} className="space-y-3 rounded-lg border bg-card p-4">
              <div className="space-y-1">
                <ResponseCompanyName response={response} label={label} />
                <p className="break-all text-sm text-muted-foreground">{email}</p>
                <p className="text-sm font-medium">{response.request_type}</p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="text-sm">{responseDisplayDate(response)}</p>
                </div>
                <Badge className={badge.className}>{badge.label}</Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setSelected(response)}
              >
                View
              </Button>
            </div>
          )
        })}
      </div>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Type of request</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {responses.map((response) => {
              const badge = STATUS_BADGE[response.status] ?? STATUS_BADGE.pending
              const label = companyLabel(response)

              return (
                <TableRow key={response.id}>
                  <TableCell className="text-sm">
                    <ResponseCompanyName response={response} label={label} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {resolveCompleterEmail(response.recipient_email, response.sharedData)}
                  </TableCell>
                  <TableCell className="font-medium">{response.request_type}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {responseDisplayDate(response)}
                  </TableCell>
                  <TableCell>
                    <Badge className={badge.className}>{badge.label}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelected(response)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

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
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingAttachments, setExportingAttachments] = useState(false)

  if (!response) return null

  const viewModel = buildResponseDetailViewModel(response)
  const companyName = viewModel.companyName
  const requiredFieldEntries = viewModel.requiredFields
  const optionalFieldEntries = viewModel.optionalFields
  const attachmentCount = response.sharedDocs.filter((doc) => doc.file_path).length
  const exporting = exportingPdf || exportingAttachments

  const sharedDocsByType = new Map(
    response.sharedDocs.map((doc) => [doc.document_type, doc])
  )

  const handleExportPdf = async () => {
    setExportingPdf(true)
    try {
      await downloadResponsePdf(response.id, viewModel)
      toast.success('PDF downloaded')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export PDF')
    } finally {
      setExportingPdf(false)
    }
  }

  const handleExportAttachments = async () => {
    setExportingAttachments(true)
    try {
      await downloadResponseAttachments(response.id, viewModel)
      toast.success(
        attachmentCount === 1 ? 'Attachment downloaded' : 'Attachments downloaded'
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to download attachments')
    } finally {
      setExportingAttachments(false)
    }
  }

  return (
    <Dialog open={!!response} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[80vh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto sm:w-full">
        <DialogHeader className="flex flex-col items-start gap-3 space-y-0 pr-10 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <DialogTitle className="text-left">Share Request - {response.request_type}</DialogTitle>
          {response.status === 'completed' ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={exporting}
                  className="w-full shrink-0 sm:w-auto"
                >
                  {exporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="mr-2 h-4 w-4" />
                  )}
                  Export
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled={exportingPdf} onSelect={() => void handleExportPdf()}>
                  <FileDown className="mr-2 h-4 w-4" />
                  PDF Download
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={exportingAttachments || attachmentCount === 0}
                  onSelect={() => void handleExportAttachments()}
                >
                  <Paperclip className="mr-2 h-4 w-4" />
                  With Attachments
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Company</p>
                <p className="text-sm font-medium">{companyName}</p>
              </div>
              {response.completed_by_company_id && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
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
                    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
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
                    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
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
                    <div key={docType} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{documentTypeLabel(docType)}</p>
                        <p className="text-xs text-gray-500">Required</p>
                        {doc && (
                          <p className="break-all text-xs text-gray-500">
                            {doc.file_name} • {formatDate(doc.uploaded_at)}
                          </p>
                        )}
                      </div>
                      {doc ? (
                        <Button variant="outline" size="sm" className="w-full shrink-0 sm:w-auto" onClick={() => downloadDocument(doc)}>
                          <Download className="mr-1 h-4 w-4" />
                          Download
                        </Button>
                      ) : (
                        <Badge variant="destructive" className="w-fit text-xs">Missing</Badge>
                      )}
                    </div>
                  )
                })}
                {response.optional_documents.map((docType) => {
                  const doc = sharedDocsByType.get(docType)
                  return (
                    <div key={docType} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{documentTypeLabel(docType)}</p>
                        <p className="text-xs text-gray-500">Optional</p>
                        {doc && (
                          <p className="break-all text-xs text-gray-500">
                            {doc.file_name} • {formatDate(doc.uploaded_at)}
                          </p>
                        )}
                      </div>
                      {doc ? (
                        <Button variant="outline" size="sm" className="w-full shrink-0 sm:w-auto" onClick={() => downloadDocument(doc)}>
                          <Download className="mr-1 h-4 w-4" />
                          Download
                        </Button>
                      ) : (
                        <Badge variant="outline" className="w-fit text-xs">Not provided</Badge>
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
