import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  CompanyDocumentRow,
  CompanyRow,
  SharedDataRow,
  ShareRequestRow,
} from '@/lib/database.types'
import {
  fetchSharedDocumentsForRequester,
  fetchSharedRecipientCompanies,
  SHARE_REQUEST_COLUMNS_WITH_DENIED,
} from '@/lib/requester-share-responses'
import { DOCUMENTS_STORAGE_BUCKET } from '@/lib/vault-documents'

export type LoadedShareResponse = Omit<ShareRequestRow, 'token'> & {
  sharedData: SharedDataRow | null
  sharedDocs: CompanyDocumentRow[]
  recipientCompany: CompanyRow | null
}

export type RequesterBranding = {
  legalName: string | null
  logoPath: string | null
  logoBuffer: Buffer | null
  logoMimeType: string | null
}

/** Load a share response and requester branding when the user owns the requester company. */
export async function loadShareResponseForExport(
  admin: SupabaseClient,
  userId: string,
  shareRequestId: string
): Promise<{ response: LoadedShareResponse; branding: RequesterBranding } | null> {
  const { data: request, error: requestError } = await admin
    .from('share_requests')
    .select(SHARE_REQUEST_COLUMNS_WITH_DENIED)
    .eq('id', shareRequestId)
    .maybeSingle()

  if (requestError || !request) {
    if (requestError) throw requestError
    return null
  }

  const typedRequest = request as Omit<ShareRequestRow, 'token'>
  if (typedRequest.status !== 'completed') return null

  const { data: requesterCompany, error: companyError } = await admin
    .from('companies')
    .select('id, legal_name, logo_path')
    .eq('id', typedRequest.requester_company_id)
    .eq('owner_user_id', userId)
    .maybeSingle()

  if (companyError) throw companyError
  if (!requesterCompany) return null

  const [{ data: sharedData }, sharedDocLinks, recipientCompanies] = await Promise.all([
    admin.from('shared_data').select('*').eq('share_request_id', shareRequestId).maybeSingle(),
    fetchSharedDocumentsForRequester(admin, [shareRequestId]),
    fetchSharedRecipientCompanies(admin, [
      typedRequest.completed_by_company_id ?? typedRequest.denied_by_company_id ?? '',
    ].filter(Boolean)),
  ])

  const recipientCompany =
    recipientCompanies.find(
      (row) => row.id === (typedRequest.completed_by_company_id ?? typedRequest.denied_by_company_id)
    ) ?? null

  let logoBuffer: Buffer | null = null
  let logoMimeType: string | null = null

  if (requesterCompany.logo_path) {
    const { data: logoBlob, error: logoError } = await admin.storage
      .from(DOCUMENTS_STORAGE_BUCKET)
      .download(requesterCompany.logo_path)

    if (!logoError && logoBlob) {
      const arrayBuffer = await logoBlob.arrayBuffer()
      logoBuffer = Buffer.from(arrayBuffer)
      logoMimeType = logoBlob.type || guessMimeFromPath(requesterCompany.logo_path)
    }
  }

  return {
    response: {
      ...typedRequest,
      sharedData: (sharedData as SharedDataRow | null) ?? null,
      sharedDocs: sharedDocLinks.map((link) => link.document),
      recipientCompany,
    },
    branding: {
      legalName: requesterCompany.legal_name,
      logoPath: requesterCompany.logo_path,
      logoBuffer,
      logoMimeType,
    },
  }
}

function guessMimeFromPath(filePath: string): string | null {
  const lower = filePath.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.svg')) return 'image/svg+xml'
  return null
}
