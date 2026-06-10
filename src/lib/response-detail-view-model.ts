import { fieldLabel, documentTypeLabel } from '@/lib/catalog'
import { formatDate } from '@/lib/utils'
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

/** Build a normalized view model for response detail UI and PDF export. */
export function buildResponseDetailViewModel(response: ShareResponseInput): ResponseDetailViewModel {
  const companyName = resolveRecipientCompanyLabel(
    response.recipientCompany,
    response.sharedData,
    response.recipient_email
  )

  const requiredFields = response.sharedData
    ? response.mandatory_fields.map((key) => ({
        key,
        label: fieldLabel(key),
        value: String(response.sharedData!.field_data[key] ?? '-'),
      }))
    : []

  const optionalFields = response.sharedData
    ? response.optional_fields.map((key) => ({
        key,
        label: fieldLabel(key),
        value: String(response.sharedData!.field_data[key] ?? '-'),
      }))
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

/** Suggested download filename for a response summary PDF. */
export function responsePdfFileName(viewModel: ResponseDetailViewModel): string {
  const slug = viewModel.companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)

  return `share-response-${slug || 'export'}.pdf`
}
