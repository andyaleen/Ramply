'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Download, FileText } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { downloadDocument } from '@/lib/file-utils'
import { fieldLabel, documentTypeLabel, type DocumentTypeKey } from '@/lib/catalog'
import {
  fetchReceivedSubmissionDetails,
  type CompletedReceivedShareRequest,
} from '@/lib/recipient-requests'

interface ReceivedSubmissionDialogProps {
  request: CompletedReceivedShareRequest | null
  onClose: () => void
}

/**
 * Dialog showing what the recipient submitted for a completed share request.
 */
export function ReceivedSubmissionDialog({ request, onClose }: ReceivedSubmissionDialogProps) {
  const supabase = createClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['received-submission-details', request?.id],
    queryFn: async () => {
      if (!request) return null
      return fetchReceivedSubmissionDetails(supabase, request.id)
    },
    enabled: !!request,
  })

  if (!request) return null

  const sharedData = data?.sharedData ?? null
  const sharedDocs = data?.sharedDocs ?? []

  const requiredFieldEntries = sharedData
    ? request.mandatory_fields.map((key) => ({
        key,
        label: fieldLabel(key),
        value: sharedData.field_data[key] ?? '-',
      }))
    : []

  const optionalFieldEntries = sharedData
    ? request.optional_fields.map((key) => ({
        key,
        label: fieldLabel(key),
        value: sharedData.field_data[key] ?? '-',
      }))
    : []

  const sharedDocsByType = new Map(sharedDocs.map((doc) => [doc.document_type, doc]))

  return (
    <Dialog open={!!request} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submitted Request — {request.request_type}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-6">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="h-16 rounded bg-muted animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <p className="py-6 text-sm text-red-600">Failed to load submission details.</p>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardContent className="py-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Company</p>
                  <p className="text-sm font-medium">{request.companyName ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{request.requesterEmail || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Received</p>
                  <p className="text-sm font-medium">{formatDate(request.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Completed</p>
                  <p className="text-sm font-medium">
                    {request.completed_at ? formatDate(request.completed_at) : '—'}
                  </p>
                </div>
              </CardContent>
            </Card>

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

            {(request.mandatory_documents.length > 0 || request.optional_documents.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Shared Documents
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {request.mandatory_documents.map((docType) => {
                    const doc = sharedDocsByType.get(docType)
                    return (
                      <DocumentRow key={docType} docType={docType} doc={doc} required />
                    )
                  })}
                  {request.optional_documents.map((docType) => {
                    const doc = sharedDocsByType.get(docType)
                    return (
                      <DocumentRow key={docType} docType={docType} doc={doc} required={false} />
                    )
                  })}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function DocumentRow({
  docType,
  doc,
  required,
}: {
  docType: DocumentTypeKey
  doc?: { id: string; file_name: string; file_path: string; uploaded_at: string }
  required: boolean
}) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div>
        <p className="font-medium text-sm">{documentTypeLabel(docType)}</p>
        <p className="text-xs text-gray-500">{required ? 'Required' : 'Optional'}</p>
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
      ) : required ? (
        <Badge variant="destructive" className="text-xs">Missing</Badge>
      ) : (
        <Badge variant="outline" className="text-xs">Not provided</Badge>
      )}
    </div>
  )
}
