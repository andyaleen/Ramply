import { fieldLabel, documentTypeLabel } from '@/lib/catalog'
import { formatDate } from '@/lib/utils'
import {
  ADDRESS_CATALOG_KEY,
  isAddressRelatedCatalogKey,
  normalizeFieldSelections,
  resolveAddressDisplayValue,
} from '@/lib/address-fields'
import {
  resolveCompleterEmail,
  resolveRecipientCompanyLabel,
} from '@/lib/requester-share-responses'
import type {
  CompanyDocumentRow,
  CompanyRow,
  SharedDataRow,
  ShareRequestRow,
} from '@/lib/database.types'

export type ResponseFieldEntry = {
  key: string
  label: string
  value: string
}

export type ResponseDocumentEntry = {
  docType: string
  label: string
  required: boolean
  fileName: string | null
  uploadedAt: string | null
  status: 'provided' | 'missing' | 'not_provided'
}

export type ResponseDetailViewModel = {
  requestType: string
  status: ShareRequestRow['status']
  companyName: string
  recipientEmail: string
  responseDate: string | null
  requiredFields: ResponseFieldEntry[]
  optionalFields: ResponseFieldEntry[]
  documents: ResponseDocumentEntry[]
}

type ShareResponseInput = Omit<ShareRequestRow, 'token'> & {
  sharedData: SharedDataRow | null
  sharedDocs: CompanyDocumentRow[]
  recipientCompany: CompanyRow | null
}

function buildFieldEntries(
  keys: string[],
  fieldData: SharedDataRow['field_data'] | null | undefined
): ResponseFieldEntry[] {
  const normalizedKeys = normalizeFieldSelections(keys)
  const entries: ResponseFieldEntry[] = []

  for (const key of normalizedKeys) {
    if (key === ADDRESS_CATALOG_KEY) {
      entries.push({
        key,
        label: fieldLabel(key),
        value: resolveAddressDisplayValue(fieldData as Record<string, unknown> | undefined),
      })
      continue
    }

    if (isAddressRelatedCatalogKey(key)) continue

    entries.push({
      key,
      label: fieldLabel(key),
      value: String(fieldData?.[key as keyof typeof fieldData] ?? '-'),
    })
  }

  return entries
}

/** Build a normalized view model for response detail UI and PDF export. */
export function buildResponseDetailViewModel(response: ShareResponseInput): ResponseDetailViewModel {
  const companyName = resolveRecipientCompanyLabel(
    response.recipientCompany,
    response.sharedData,
    response.recipient_email
  )

  const requiredFields = response.sharedData
    ? buildFieldEntries(response.mandatory_fields ?? [], response.sharedData.field_data)
    : []

  const optionalFields = response.sharedData
    ? buildFieldEntries(response.optional_fields ?? [], response.sharedData.field_data)
    : []

  const sharedDocsByType = new Map(response.sharedDocs.map((doc) => [doc.document_type, doc]))

  const documents: ResponseDocumentEntry[] = [
    ...response.mandatory_documents.map((docType) => {
      const doc = sharedDocsByType.get(docType)
      return {
        docType,
        label: documentTypeLabel(docType),
        required: true,
        fileName: doc?.file_name ?? null,
        uploadedAt: doc?.uploaded_at ?? null,
        status: doc ? 'provided' as const : 'missing' as const,
      }
    }),
    ...response.optional_documents.map((docType) => {
      const doc = sharedDocsByType.get(docType)
      return {
        docType,
        label: documentTypeLabel(docType),
        required: false,
        fileName: doc?.file_name ?? null,
        uploadedAt: doc?.uploaded_at ?? null,
        status: doc ? 'provided' as const : 'not_provided' as const,
      }
    }),
  ]

  const responseDate = response.denied_at ?? response.completed_at ?? response.created_at

  return {
    requestType: response.request_type,
    status: response.status,
    companyName,
    recipientEmail: resolveCompleterEmail(response.recipient_email, response.sharedData),
    responseDate: responseDate ? formatDate(responseDate) : null,
    requiredFields,
    optionalFields,
    documents,
  }
}

/** URL-safe slug derived from the recipient company name for export filenames. */
export function responseExportSlug(viewModel: ResponseDetailViewModel): string {
  return viewModel.companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

/** Suggested download filename for a response summary PDF. */
export function responsePdfFileName(viewModel: ResponseDetailViewModel): string {
  const slug = responseExportSlug(viewModel)
  return `share-response-${slug || 'export'}.pdf`
}

/** Suggested download filename for a bundled attachments zip. */
export function responseAttachmentsZipFileName(viewModel: ResponseDetailViewModel): string {
  const slug = responseExportSlug(viewModel)
  return `share-response-${slug || 'export'}-attachments.zip`
}
