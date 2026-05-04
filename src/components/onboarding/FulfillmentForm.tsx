'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import type { ShareRequestRow, CompanyDocumentRow } from '@/lib/database.types'
import { fieldLabel, documentTypeLabel, type FieldKey, type DocumentTypeKey } from '@/lib/catalog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, FileText, Upload, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useDocumentUpload } from '@/hooks/useDocumentUpload'

type ShareRequestForFulfillment = Omit<ShareRequestRow, 'token'>

interface FulfillmentFormProps {
  shareRequest: ShareRequestForFulfillment
  vaultDocs: CompanyDocumentRow[]
  onComplete: () => void
}

export function FulfillmentForm({ shareRequest, vaultDocs, onComplete }: FulfillmentFormProps) {
  const { user, company } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()

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

  const allDocTypes = [
    ...shareRequest.mandatory_documents,
    ...shareRequest.optional_documents,
  ] as DocumentTypeKey[]

  const findDoc = (docType: DocumentTypeKey) =>
    vaultDocs.find(d => d.document_type === docType) ?? null

  const missingRequiredDocs = shareRequest.mandatory_documents.filter(
    docType => !vaultDocs.some(d => d.document_type === docType)
  ) as DocumentTypeKey[]

  const { inputRef, uploading, pick, handleFileChange } = useDocumentUpload({
    user,
    company,
    existingDocs: vaultDocs,
    onSuccess: ({ doc, duplicate }, docType) => {
      if (duplicate) {
        toast.info('This file is identical to the current version — no update needed.')
        return
      }
      toast.success(`${documentTypeLabel(docType)} uploaded`)
      queryClient.setQueryData<CompanyDocumentRow[]>(
        ['vault-docs', company?.id],
        (current = []) => {
          const filtered = current.filter(existing => existing.document_type !== docType)
          return [...filtered, doc]
        }
      )
      queryClient.invalidateQueries({ queryKey: ['vault-docs', company?.id] })
    },
    onError: () => {
      toast.error('Upload failed. Please try again.')
    },
    onClassified: (slotType, detectedType) => {
      if (!detectedType || detectedType === slotType) return
      toast.warning(
        `This looks like a ${documentTypeLabel(detectedType)}, but it was uploaded to the ${documentTypeLabel(slotType)} slot. You can replace it if needed.`,
        { duration: 8000 }
      )
    },
  })

  const mutation = useMutation({
    mutationFn: async () => {
      if (!company) throw new Error('No company found')

      const documentIds = allDocTypes
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
      {allDocTypes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Documents Requested</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {shareRequest.mandatory_documents.map((docType) => (
              <DocRow
                key={docType}
                docType={docType as DocumentTypeKey}
                required
                doc={findDoc(docType as DocumentTypeKey)}
                uploading={uploading === docType}
                onUpload={pick}
              />
            ))}
            {shareRequest.optional_documents.map((docType) => (
              <DocRow
                key={docType}
                docType={docType as DocumentTypeKey}
                required={false}
                doc={findDoc(docType as DocumentTypeKey)}
                uploading={uploading === docType}
                onUpload={pick}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Hidden file input shared across all doc rows */}
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
        onChange={handleFileChange}
      />

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

interface DocRowProps {
  docType: DocumentTypeKey
  required: boolean
  doc: CompanyDocumentRow | null
  uploading: boolean
  onUpload: (docType: DocumentTypeKey) => void
}

function DocRow({ docType, required, doc, uploading, onUpload }: DocRowProps) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-md">
      <div className="flex items-center gap-2 min-w-0">
        {doc
          ? <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
          : <FileText className="h-4 w-4 text-muted-foreground shrink-0" />}
        <span className="text-sm font-medium truncate">{documentTypeLabel(docType)}</span>
        <Badge variant="outline" className="text-[10px] uppercase tracking-wide shrink-0">
          {required ? 'Required' : 'Optional'}
        </Badge>
      </div>
      <div className="flex items-center gap-2 ml-3 shrink-0">
        {doc && (
          <span className="text-xs text-muted-foreground max-w-32 truncate hidden sm:block">
            {doc.file_name}
          </span>
        )}
        <Button
          size="sm"
          variant={doc ? 'outline' : 'default'}
          onClick={() => onUpload(docType)}
          disabled={uploading}
        >
          {uploading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <><Upload className="h-3 w-3 mr-1" />{doc ? 'Replace' : 'Upload'}</>
          }
        </Button>
      </div>
    </div>
  )
}
