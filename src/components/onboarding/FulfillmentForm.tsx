'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import type { ShareRequestRow, CompanyDocumentRow } from '@/lib/database.types'
import { fieldLabel, documentTypeLabel, type FieldKey, type DocumentTypeKey } from '@/lib/catalog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, FileText, Upload, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useDocumentUpload } from '@/hooks/useDocumentUpload'
import { useVaultDocuments } from '@/hooks/useVaultDocuments'
import { getUploadErrorMessage } from '@/lib/document-upload'
import {
  getVaultDocument,
  missingVaultDocumentTypes,
  vaultDocsQueryKey,
} from '@/lib/vault-documents'

type ShareRequestForFulfillment = Omit<ShareRequestRow, 'token'>

interface FulfillmentFormProps {
  shareRequest: ShareRequestForFulfillment
  onComplete: () => void
}

export function FulfillmentForm({ shareRequest, onComplete }: FulfillmentFormProps) {
  const { user, company } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { data: vaultDocs = [], isLoading: vaultLoading } = useVaultDocuments(company?.id)

  /** Pre-fill field values from the authenticated user's company profile */
  const [fieldValues, setFieldValues] = useState<Partial<Record<FieldKey, string>>>(() => {
    if (!company) return {}
    const vals: Partial<Record<FieldKey, string>> = {}
    const allFields = [...(shareRequest.mandatory_fields ?? []), ...(shareRequest.optional_fields ?? [])]
    for (const key of allFields) {
      const val = company[key as keyof typeof company]
      if (typeof val === 'string') vals[key] = val
    }
    return vals
  })

  const mandatoryDocTypes = (shareRequest.mandatory_documents ?? []) as DocumentTypeKey[]
  const optionalDocTypes = (shareRequest.optional_documents ?? []) as DocumentTypeKey[]
  const allDocTypes = [...mandatoryDocTypes, ...optionalDocTypes]

  const missingRequiredDocs = useMemo(
    () => missingVaultDocumentTypes(vaultDocs, mandatoryDocTypes),
    [vaultDocs, mandatoryDocTypes]
  )

  const missingRequiredFields = (shareRequest.mandatory_fields ?? []).filter(
    (key) => !fieldValues[key]?.trim()
  )

  const { inputRef, uploading, pick, handleFileChange } = useDocumentUpload({
    user,
    company,
    existingDocs: vaultDocs,
    onSuccess: ({ doc, duplicate }, docType) => {
      if (duplicate) {
        toast.info(`${documentTypeLabel(docType)} is already in your Document Vault.`)
        return
      }
      toast.success(`${documentTypeLabel(docType)} saved to your Document Vault`)
      queryClient.setQueryData<CompanyDocumentRow[]>(
        vaultDocsQueryKey(company?.id),
        (current = []) => {
          const filtered = current.filter((existing) => existing.document_type !== docType)
          return [...filtered, doc]
        }
      )
      queryClient.invalidateQueries({ queryKey: vaultDocsQueryKey(company?.id) })
    },
    onError: (err) => {
      toast.error(getUploadErrorMessage(err))
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
      if (missingRequiredFields.length > 0) {
        throw new Error('missing_required_fields')
      }

      const latestVaultDocs =
        queryClient.getQueryData<CompanyDocumentRow[]>(vaultDocsQueryKey(company.id)) ?? vaultDocs

      const stillMissing = missingVaultDocumentTypes(latestVaultDocs, mandatoryDocTypes)
      if (stillMissing.length > 0) {
        throw new Error('missing_required_documents')
      }

      const documentIds = allDocTypes
        .map((docType) => getVaultDocument(latestVaultDocs, docType))
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
    onError: (error: Error) => {
      if (error.message === 'missing_required_fields') {
        toast.error('Please fill in all required fields.')
        return
      }
      if (error.message === 'missing_required_documents') {
        toast.error('Please upload all required documents.')
        return
      }
      toast.error('Failed to submit. Please try again.')
    },
  })

  return (
    <div className="space-y-6">
      {/* Fields */}
      {(shareRequest.mandatory_fields?.length ?? 0) > 0 || (shareRequest.optional_fields?.length ?? 0) > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Information Requested</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(shareRequest.mandatory_fields?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Required</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(shareRequest.mandatory_fields ?? []).map((key) => (
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
            {(shareRequest.optional_fields?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Optional</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(shareRequest.optional_fields ?? []).map((key) => (
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
      ) : null}

      {/* Documents */}
      {allDocTypes.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Documents Requested</CardTitle>
            <CardDescription>
              Documents are saved to your Document Vault and reused automatically the next time someone
              asks for them. Upload only what you do not already have on file.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {vaultLoading ? (
              <div className="space-y-2">
                {[...Array(2)].map((_, index) => (
                  <div key={index} className="h-14 rounded-md bg-muted animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                {mandatoryDocTypes.map((docType) => (
                  <DocRow
                    key={docType}
                    docType={docType}
                    required
                    doc={getVaultDocument(vaultDocs, docType)}
                    uploading={uploading === docType}
                    onUpload={pick}
                  />
                ))}
                {optionalDocTypes.map((docType) => (
                  <DocRow
                    key={docType}
                    docType={docType}
                    required={false}
                    doc={getVaultDocument(vaultDocs, docType)}
                    uploading={uploading === docType}
                    onUpload={pick}
                  />
                ))}
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

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
        disabled={
          mutation.isPending
          || vaultLoading
          || missingRequiredDocs.length > 0
          || missingRequiredFields.length > 0
          || !company
        }
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
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{documentTypeLabel(docType)}</span>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide shrink-0">
              {required ? 'Required' : 'Optional'}
            </Badge>
            {doc ? (
              <Badge variant="secondary" className="text-[10px] shrink-0">
                From vault
              </Badge>
            ) : null}
          </div>
          {doc ? (
            <p className="text-xs text-muted-foreground truncate">
              {doc.file_name}
              {doc.version > 1 ? ` · v${doc.version}` : ''}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Not in your vault yet</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 ml-3 shrink-0">
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
