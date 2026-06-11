'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import type { ShareRequestRow, CompanyDocumentRow } from '@/lib/database.types'
import { fieldLabel, documentTypeLabel } from '@/lib/catalog'
import { isCustomSelectionKey } from '@/lib/custom-selections'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CompanyFieldInput } from '@/components/company/CompanyFieldInput'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, FileText, Upload, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useDocumentUpload } from '@/hooks/useDocumentUpload'
import { useVaultDocuments } from '@/hooks/useVaultDocuments'
import { getUploadErrorMessage } from '@/lib/document-upload'
import { DenyShareRequestDialog } from '@/components/onboarding/DenyShareRequestDialog'
import {
  getVaultDocument,
  missingVaultDocumentTypes,
  vaultDocsQueryKey,
} from '@/lib/vault-documents'
import {
  ADDRESS_CATALOG_KEY,
  ADDRESS_COMPONENT_KEYS,
  buildShareAddressFieldPayload,
  isAddressComplete,
  partitionRequestFields,
  pickAddressComponents,
  requestIncludesAddress,
} from '@/lib/address-fields'
import { profileUpdatesFromFulfillmentFields } from '@/lib/fulfillment-profile-sync'
import { AddressFieldsSection } from '@/components/address/AddressFieldsSection'

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
  const { data: vaultDocs = [], isFetching: vaultFetching, isFetched: vaultFetched } =
    useVaultDocuments(company?.id)
  const vaultChecking = !!company?.id && !vaultFetched && vaultFetching

  const mandatoryFieldKeys = shareRequest.mandatory_fields ?? []
  const optionalFieldKeys = shareRequest.optional_fields ?? []
  const allRequestedFieldKeys = [...mandatoryFieldKeys, ...optionalFieldKeys]

  const mandatoryNonAddress = useMemo(
    () => partitionRequestFields(mandatoryFieldKeys).nonAddressFields,
    [mandatoryFieldKeys]
  )
  const optionalNonAddress = useMemo(
    () => partitionRequestFields(optionalFieldKeys).nonAddressFields,
    [optionalFieldKeys]
  )
  const addressRequired = requestIncludesAddress(mandatoryFieldKeys)
  const addressOptional = requestIncludesAddress(optionalFieldKeys) && !addressRequired

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

  const missingRequiredDocs = useMemo(
    () => missingVaultDocumentTypes(vaultDocs, mandatoryDocTypes),
    [vaultDocs, mandatoryDocTypes]
  )

  const missingRequiredFields = useMemo(() => {
    const missing: string[] = []

    if (addressRequired && !isAddressComplete(addressComponents)) {
      missing.push(ADDRESS_CATALOG_KEY)
    }

    for (const key of mandatoryNonAddress) {
      if (!fieldValues[key]?.trim()) missing.push(key)
    }

    return missing
  }, [addressRequired, addressComponents, mandatoryNonAddress, fieldValues])

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
          <CardContent className="space-y-4">
            {(mandatoryFieldKeys.length > 0) && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Required</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addressRequired ? (
                    <div className="md:col-span-2">
                      <AddressFieldsSection
                        value={addressComponents}
                        onChange={handleAddressChange}
                        addressLabel={fieldLabel(ADDRESS_CATALOG_KEY)}
                        addressInvalid={
                          pendingBlankFieldConfirm
                          && missingRequiredFields.includes(ADDRESS_CATALOG_KEY)
                        }
                      />
                      {pendingBlankFieldConfirm && missingRequiredFields.includes(ADDRESS_CATALOG_KEY) ? (
                        <p className="mt-1 text-xs text-amber-700">Leave this address blank?</p>
                      ) : null}
                    </div>
                  ) : null}
                  {mandatoryNonAddress.map((key) => {
                    const isBlank = !fieldValues[key]?.trim()
                    const showBlankPrompt = pendingBlankFieldConfirm && isBlank
                    return (
                      <div key={key}>
                        <Label>{fieldLabel(key)}</Label>
                        <CompanyFieldInput
                          fieldKey={key}
                          value={fieldValues[key] ?? ''}
                          onChange={(value) => handleFieldChange(key, value)}
                          aria-invalid={showBlankPrompt}
                          className={showBlankPrompt ? 'border-amber-500 focus-visible:ring-amber-500' : undefined}
                        />
                        {showBlankPrompt ? (
                          <p className="mt-1 text-xs text-amber-700">Leave this field blank?</p>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {(optionalFieldKeys.length > 0) && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Optional</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addressOptional ? (
                    <div className="md:col-span-2">
                      <AddressFieldsSection
                        value={addressComponents}
                        onChange={handleAddressChange}
                        addressLabel={fieldLabel(ADDRESS_CATALOG_KEY)}
                      />
                    </div>
                  ) : null}
                  {optionalNonAddress.map((key) => (
                    <div key={key}>
                      <Label>{fieldLabel(key)}</Label>
                      <CompanyFieldInput
                        fieldKey={key}
                        value={fieldValues[key] ?? ''}
                        onChange={(value) => handleFieldChange(key, value)}
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
            {mandatoryDocTypes.map((docType) => (
              <DocRow
                key={docType}
                docType={docType}
                required
                doc={getVaultDocument(vaultDocs, docType)}
                vaultChecking={vaultChecking}
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
                vaultChecking={vaultChecking}
                uploading={uploading === docType}
                onUpload={pick}
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
  onUpload: (docType: string) => void
}

function DocRow({ docType, required, doc, vaultChecking, uploading, onUpload }: DocRowProps) {
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
