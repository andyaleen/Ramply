'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import type { ShareRequestRow, CompanyDocumentRow } from '@/lib/database.types'
import { fieldLabel, documentTypeLabel, type FieldKey, type DocumentTypeKey } from '@/lib/catalog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, FileText, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

type ShareRequestForFulfillment = Omit<ShareRequestRow, 'recipient_email' | 'token'>

interface FulfillmentFormProps {
  shareRequest: ShareRequestForFulfillment
  vaultDocs: CompanyDocumentRow[]
  onComplete: () => void
}

export function FulfillmentForm({ shareRequest, vaultDocs, onComplete }: FulfillmentFormProps) {
  const { company } = useAuth()
  const supabase = createClient()

  /** Pre-fill field values from the authenticated user's company profile */
  const [fieldValues, setFieldValues] = useState<Partial<Record<FieldKey, string>>>(() => {
    if (!company) return {}
    const vals: Partial<Record<FieldKey, string>> = {}
    const allFields = [...shareRequest.mandatory_fields, ...shareRequest.optional_fields]
    for (const key of allFields) {
      const val = company[key as keyof typeof company]
      if (typeof val === 'string') vals[key] = val
    }
    return vals
  })

  const findDoc = (docType: DocumentTypeKey) =>
    vaultDocs.find(d => d.document_type === docType) ?? null

  const missingRequiredDocs = shareRequest.mandatory_documents.filter(
    docType => !vaultDocs.some(d => d.document_type === docType)
  ) as DocumentTypeKey[]

  const mutation = useMutation({
    mutationFn: async () => {
      if (!company) throw new Error('No company found')

      const documentIds = [
        ...shareRequest.mandatory_documents,
        ...shareRequest.optional_documents,
      ]
        .map(findDoc)
        .filter((doc): doc is CompanyDocumentRow => !!doc)
        .map((doc) => doc.id)

      const { error } = await supabase.rpc('fulfill_share_request', {
        p_share_request_id: shareRequest.id,
        p_field_data: fieldValues,
        p_company_document_ids: documentIds,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Information shared successfully!')
      onComplete()
    },
    onError: () => {
      toast.error('Failed to submit. Please try again.')
    },
  })

  return (
    <div className="space-y-6">
      {/* Fields */}
      {(shareRequest.mandatory_fields.length > 0 || shareRequest.optional_fields.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Information Requested</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {shareRequest.mandatory_fields.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Required</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {shareRequest.mandatory_fields.map((key) => (
                    <div key={key}>
                      <Label>{fieldLabel(key)}</Label>
                      <Input
                        value={fieldValues[key] ?? ''}
                        onChange={(e) => setFieldValues(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder={`Enter ${fieldLabel(key)}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {shareRequest.optional_fields.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Optional</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {shareRequest.optional_fields.map((key) => (
                    <div key={key}>
                      <Label>{fieldLabel(key)}</Label>
                      <Input
                        value={fieldValues[key] ?? ''}
                        onChange={(e) => setFieldValues(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder={`Enter ${fieldLabel(key)}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Documents */}
      {(shareRequest.mandatory_documents.length > 0 || shareRequest.optional_documents.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Documents Requested</CardTitle>
            {missingRequiredDocs.length > 0 && (
              <div className="flex items-start gap-2 text-sm text-destructive mt-1">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  Missing required documents:{' '}
                  {missingRequiredDocs.map(k => documentTypeLabel(k)).join(', ')}.{' '}
                  Please upload them in your{' '}
                  <Link href="/dashboard/documents" className="underline font-medium">Document Vault</Link> first.
                </span>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {shareRequest.mandatory_documents.map((docType) => {
              const doc = findDoc(docType)
              return (
                <div key={docType} className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center gap-2">
                    {doc
                      ? <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                      : <FileText className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <span className="text-sm font-medium">{documentTypeLabel(docType)}</span>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide">Required</Badge>
                  </div>
                  {doc
                    ? <Badge variant="secondary" className="text-xs max-w-40 truncate">{doc.file_name}</Badge>
                    : <Badge variant="destructive" className="text-xs">Not in vault</Badge>}
                </div>
              )
            })}
            {shareRequest.optional_documents.map((docType) => {
              const doc = findDoc(docType)
              return (
                <div key={docType} className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center gap-2">
                    {doc
                      ? <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                      : <FileText className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <span className="text-sm font-medium">{documentTypeLabel(docType)}</span>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide">Optional</Badge>
                  </div>
                  {doc
                    ? <Badge variant="secondary" className="text-xs max-w-40 truncate">{doc.file_name}</Badge>
                    : <Badge variant="outline" className="text-xs">Not in vault</Badge>}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      <Button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || missingRequiredDocs.length > 0 || !company}
        size="lg"
        className="w-full"
      >
        {mutation.isPending ? 'Submitting…' : 'Share Information'}
      </Button>
    </div>
  )
}
