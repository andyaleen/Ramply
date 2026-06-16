'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import type { ShareRequestRow, CompanyDocumentRow } from '@/lib/database.types'
import { fieldLabel, documentTypeLabel, orderRequestedDocuments, type DocumentTypeKey, type FieldKey } from '@/lib/catalog'
import { isCustomSelectionKey } from '@/lib/custom-selections'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CompanyFieldInput } from '@/components/company/CompanyFieldInput'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, FileText, Upload, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import posthog from 'posthog-js'
import { useDocumentUpload } from '@/hooks/useDocumentUpload'
import { useVaultDocuments } from '@/hooks/useVaultDocuments'
import { getUploadErrorMessage } from '@/lib/document-upload'
import { DenyShareRequestDialog } from '@/components/onboarding/DenyShareRequestDialog'
import { VaultDocumentTextAction } from '@/components/company/VaultDocumentTextAction'
import {
  getVaultDocument,
  missingVaultDocumentTypes,
  vaultDocsQueryKey,
} from '@/lib/vault-documents'
import { deleteVaultDocument } from '@/lib/delete-vault-document'
import {
  ADDRESS_CATALOG_KEY,
  ADDRESS_COMPONENT_KEYS,
  buildShareAddressFieldPayload,
  isAddressComplete,
  orderRequestedFields,
  partitionRequestFields,
  pickAddressComponents,
  requestIncludesAddress,
} from '@/lib/address-fields'
import { profileUpdatesFromFulfillmentFields } from '@/lib/fulfillment-profile-sync'
import { AddressFieldsSection } from '@/components/address/AddressFieldsSection'
import { getFieldValueError } from '@/lib/field-inputs'

type ShareRequestForFulfillment = Omit<ShareRequestRow, 'token'>

interface FulfillmentFormProps {
  shareRequest: ShareRequestForFulfillment
  onComplete: () => void
  onDenied?: () => void
}

export function FulfillmentForm({ shareRequest, onComplete, onDenied }: FulfillmentFormProps) {
  const { user, company, updateCompany } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [denyDialogOpen, setDenyDialogOpen] = useState(false)
  const [pendingBlankFieldConfirm, setPendingBlankFieldConfirm] = useState(false)
  const [removingDocType, setRemovingDocType] = useState<string | null>(null)
  const { data: vaultDocs = [], isFetching: vaultFetching, isFetched: vaultFetched } =
    useVaultDocuments(company?.id)
  const vaultChecking = !!company?.id && !vaultFetched && vaultFetching

  const mandatoryFieldKeys = shareRequest.mandatory_fields ?? []
  const optionalFieldKeys = shareRequest.optional_fields ?? []
  const allRequestedFieldKeys = [...mandatoryFieldKeys, ...optionalFieldKeys]

  const orderedRequestedFields = useMemo(
    () => orderRequestedFields(allRequestedFieldKeys),
    [allRequestedFieldKeys]
  )
  const mandatoryNonAddress = useMemo(
    () => partitionRequestFields(mandatoryFieldKeys).nonAddressFields,
    [mandatoryFieldKeys]
  )

  const isFieldRequired = (key: string) => {
    if (key === ADDRESS_CATALOG_KEY) return requestIncludesAddress(mandatoryFieldKeys)
    return mandatoryFieldKeys.includes(key as FieldKey)
  }

  /** Pre-fill field values from the authenticated user's company profile */
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => {
    if (!company) return {}
    const vals: Record<string, string> = {}

    for (const key of allRequestedFieldKeys) {
      if (isCustomSelectionKey(key)) continue
      if (key === ADDRESS_CATALOG_KEY || requestIncludesAddress([key])) continue
      const val = company[key as keyof typeof company]
      if (typeof val === 'string') vals[key] = val
    }

    if (requestIncludesAddress(allRequestedFieldKeys)) {
      for (const key of ADDRESS_COMPONENT_KEYS) {
        const val = company[key as keyof typeof company]
        if (typeof val === 'string') vals[key] = val
      }
    }

    return vals
  })

  const addressComponents = useMemo(
    () => pickAddressComponents(fieldValues),
    [fieldValues]
  )

  const mandatoryDocTypes = shareRequest.mandatory_documents ?? []
  const optionalDocTypes = shareRequest.optional_documents ?? []
  const allDocTypes = [...mandatoryDocTypes, ...optionalDocTypes]
  const orderedDocTypes = useMemo(
    () => orderRequestedDocuments(allDocTypes),
    [allDocTypes]
  )

  const missingRequiredDocs = useMemo(
    () => missingVaultDocumentTypes(vaultDocs, mandatoryDocTypes),
    [vaultDocs, mandatoryDocTypes]
  )

  const missingRequiredFields = useMemo(() => {
    const missing: string[] = []

    if (requestIncludesAddress(mandatoryFieldKeys) && !isAddressComplete(addressComponents)) {
      missing.push(ADDRESS_CATALOG_KEY)
    }

    for (const key of mandatoryNonAddress) {
      if (!fieldValues[key]?.trim()) missing.push(key)
    }

    return missing
  }, [mandatoryFieldKeys, addressComponents, mandatoryNonAddress, fieldValues])

  const fieldFormatErrors = useMemo(() => {
    const errors: Record<string, string> = {}

    for (const key of allRequestedFieldKeys) {
      if (isCustomSelectionKey(key)) continue
      if (key === ADDRESS_CATALOG_KEY || requestIncludesAddress([key])) continue
      const error = getFieldValueError(key, fieldValues[key])
      if (error) errors[key] = error
    }

    return errors
  }, [allRequestedFieldKeys, fieldValues])

  const handleFieldChange = (key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleAddressChange = (components: ReturnType<typeof pickAddressComponents>) => {
    setFieldValues((prev) => ({ ...prev, ...components }))
  }

  const buildFieldPayload = () => {
    const requested = allRequestedFieldKeys
    const payload: Record<string, string> = {}

    if (requestIncludesAddress(requested)) {
      Object.assign(payload, buildShareAddressFieldPayload(requested, addressComponents))
    }

    for (const key of requested) {
      if (isCustomSelectionKey(key)) {
        payload[key] = fieldValues[key] ?? ''
        continue
      }
      if (key === ADDRESS_CATALOG_KEY || requestIncludesAddress([key])) continue
      payload[key] = fieldValues[key] ?? ''
    }

    for (const key of requested) {
      if (payload[key] === undefined) payload[key] = ''
    }

    return payload
  }

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
      if (!detectedType || detectedType === slotType || isCustomSelectionKey(slotType)) return
      toast.warning(
        `This looks like a ${documentTypeLabel(detectedType)}, but it was uploaded to the ${documentTypeLabel(slotType)} slot. You can replace it if needed.`,
        { duration: 8000 }
      )
    },
  })

  const handleRemoveDocument = async (docType: string) => {
    const doc = getVaultDocument(vaultDocs, docType)
    if (!doc) return

    const label = documentTypeLabel(docType)
    if (!window.confirm(`Remove ${label} from your Document Vault?`)) {
      return
    }

    setRemovingDocType(docType)

    try {
      await deleteVaultDocument(supabase, doc)
      toast.success(`${label} removed`)
      queryClient.setQueryData<CompanyDocumentRow[]>(
        vaultDocsQueryKey(company?.id),
        (current = []) => current.filter((existing) => existing.id !== doc.id)
      )
      queryClient.invalidateQueries({ queryKey: vaultDocsQueryKey(company?.id) })
    } catch (err) {
      console.error('Document remove failed:', err)
      toast.error(`Failed to remove ${label}. Please try again.`)
    } finally {
      setRemovingDocType(null)
    }
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!company) throw new Error('No company found')

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

      const fieldPayload = buildFieldPayload()

      const { error } = await supabase.rpc('fulfill_share_request', {
        p_share_request_id: shareRequest.id,
        p_field_data: fieldPayload,
        p_company_document_ids: documentIds,
      })
      if (error) throw error

      const profileUpdates = profileUpdatesFromFulfillmentFields(fieldPayload, addressComponents)
      if (Object.keys(profileUpdates).length > 0) {
        try {
          await updateCompany(profileUpdates)
        } catch (profileError) {
          console.error('Failed to sync profile after share:', profileError)
        }
      }
    },
    onSuccess: () => {
      setPendingBlankFieldConfirm(false)
      posthog.capture('share_request_fulfilled', {
        field_count: mandatoryFieldKeys.length + optionalFieldKeys.length,
        document_count: mandatoryDocTypes.length + optionalDocTypes.length,
        request_type: shareRequest.request_type,
      })
      toast.success('Information shared successfully!')
      onComplete()
    },
    onError: (error: Error) => {
      if (error.message === 'missing_required_documents') {
        toast.error('Please upload all required documents.')
        return
      }
      toast.error('Failed to submit. Please try again.')
    },
  })

  const handleShareInformation = () => {
    if (Object.keys(fieldFormatErrors).length > 0) {
      toast.error('Please fix the highlighted fields before sharing.')
      return
    }

    if (missingRequiredFields.length > 0 && !pendingBlankFieldConfirm) {
      setPendingBlankFieldConfirm(true)
      return
    }
    mutation.mutate()
  }

  const handleDenyRequest = async () => {
    const response = await fetch('/api/share-requests/deny', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ share_request_id: shareRequest.id }),
    })

    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    if (!response.ok) {
      const message = payload.error ?? 'Failed to deny request'
      toast.error(message)
      throw new Error(message)
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['pending-received-requests'] }),
      queryClient.invalidateQueries({ queryKey: ['share-responses'] }),
    ])

    posthog.capture('share_request_denied', { request_type: shareRequest.request_type })
    toast.success('Request denied. The sender has been notified.')
    onDenied?.()
    router.push('/dashboard/responses')
  }

  return (
    <div className="space-y-6">
      {/* Fields */}
      {(shareRequest.mandatory_fields?.length ?? 0) > 0 || (shareRequest.optional_fields?.length ?? 0) > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Information Requested</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orderedRequestedFields.map((key) => {
                const required = isFieldRequired(key)

                if (key === ADDRESS_CATALOG_KEY) {
                  const showBlankPrompt =
                    required
                    && pendingBlankFieldConfirm
                    && missingRequiredFields.includes(ADDRESS_CATALOG_KEY)
                  return (
                    <div key={key} className="md:col-span-2">
                      <div className="mb-2 flex items-center gap-2">
                        <Label>{fieldLabel(ADDRESS_CATALOG_KEY)}</Label>
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wide shrink-0">
                          {required ? 'Required' : 'Optional'}
                        </Badge>
                      </div>
                      <AddressFieldsSection
                        value={addressComponents}
                        onChange={handleAddressChange}
                        addressLabel={fieldLabel(ADDRESS_CATALOG_KEY)}
                        addressInvalid={showBlankPrompt}
                        hideLabel
                      />
                      {showBlankPrompt ? (
                        <p className="mt-1 text-xs text-amber-700">Leave this address blank?</p>
                      ) : null}
                    </div>
                  )
                }

                const isBlank = !fieldValues[key]?.trim()
                const showBlankPrompt = required && pendingBlankFieldConfirm && isBlank
                const formatError = fieldFormatErrors[key]
                const showInvalid = showBlankPrompt || !!formatError
                return (
                  <div key={key}>
                    <div className="mb-2 flex items-center gap-2">
                      <Label>{fieldLabel(key)}</Label>
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wide shrink-0">
                        {required ? 'Required' : 'Optional'}
                      </Badge>
                    </div>
                    <CompanyFieldInput
                      fieldKey={key}
                      value={fieldValues[key] ?? ''}
                      onChange={(value) => handleFieldChange(key, value)}
                      aria-invalid={showInvalid}
                      className={
                        formatError
                          ? 'border-red-500 focus-visible:ring-red-500'
                          : showBlankPrompt
                            ? 'border-amber-500 focus-visible:ring-amber-500'
                            : undefined
                      }
                    />
                    {formatError ? (
                      <p className="mt-1 text-xs text-red-700">{formatError}</p>
                    ) : showBlankPrompt ? (
                      <p className="mt-1 text-xs text-amber-700">Leave this field blank?</p>
                    ) : null}
                  </div>
                )
              })}
            </div>
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
            {orderedDocTypes.map((docType) => (
              <DocRow
                key={docType}
                docType={docType}
                required={mandatoryDocTypes.includes(docType as DocumentTypeKey)}
                doc={getVaultDocument(vaultDocs, docType)}
                vaultChecking={vaultChecking}
                uploading={uploading === docType}
                removing={removingDocType === docType}
                onUpload={pick}
                onRemove={() => void handleRemoveDocument(docType)}
              />
            ))}
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

      {pendingBlankFieldConfirm && missingRequiredFields.length > 0 ? (
        <p className="text-sm text-amber-800">
          Some required fields are empty. Click Share Information again to confirm sending them blank.
        </p>
      ) : null}

      <Button
        onClick={handleShareInformation}
        disabled={
          mutation.isPending
          || vaultChecking
          || missingRequiredDocs.length > 0
          || !company
        }
        size="lg"
        className="w-full"
      >
        {mutation.isPending ? 'Submitting…' : 'Share Information'}
      </Button>

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full border-red-200 bg-red-50 text-red-800 hover:bg-red-100 hover:text-red-900"
        onClick={() => setDenyDialogOpen(true)}
        disabled={mutation.isPending}
      >
        Deny Request
      </Button>

      <DenyShareRequestDialog
        open={denyDialogOpen}
        onOpenChange={setDenyDialogOpen}
        onConfirm={handleDenyRequest}
      />
    </div>
  )
}

interface DocRowProps {
  docType: string
  required: boolean
  doc: CompanyDocumentRow | null
  vaultChecking: boolean
  uploading: boolean
  removing: boolean
  onUpload: (docType: string) => void
  onRemove: () => void
}

function DocRow({
  docType,
  required,
  doc,
  vaultChecking,
  uploading,
  removing,
  onUpload,
  onRemove,
}: DocRowProps) {
  const actionDisabled = uploading || removing

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
          ) : vaultChecking ? (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Checking vault…
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Not in your vault yet</p>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 ml-3 shrink-0">
        <Button
          size="sm"
          variant={doc ? 'outline' : 'default'}
          onClick={() => onUpload(docType)}
          disabled={actionDisabled}
        >
          {uploading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <><Upload className="h-3 w-3 mr-1" />{doc ? 'Replace' : 'Upload'}</>
          }
        </Button>
        {doc ? (
          <VaultDocumentTextAction
            label={removing ? 'Removing…' : 'Remove'}
            onClick={onRemove}
            disabled={actionDisabled}
          />
        ) : null}
      </div>
    </div>
  )
}
