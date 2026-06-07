import { NextResponse } from 'next/server'
import { z } from 'zod'

import { CATALOG_DOCUMENT_TYPES, type DocumentTypeKey } from '@/lib/catalog'
import {
  getUploadErrorMessage,
  isUserOwnedDocumentPath,
} from '@/lib/document-upload'
import type { CompanyDocumentRow } from '@/lib/database.types'
import { createAdminClient } from '@/lib/supabase/admin'
import { createBearerClient } from '@/lib/supabase/bearer'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

/** Prefer service-role writes after auth checks so vault inserts are reliable. */
function getPersistenceClient(fallback: SupabaseClient): SupabaseClient {
  try {
    return createAdminClient()
  } catch {
    return fallback
  }
}

const docTypeKeys = CATALOG_DOCUMENT_TYPES.map((doc) => doc.key) as [
  DocumentTypeKey,
  ...DocumentTypeKey[],
]

const CompleteUploadSchema = z.object({
  document_type: z.enum(docTypeKeys),
  file_path: z.string().min(1),
  file_name: z.string().min(1),
  file_size: z.number().int().nonnegative(),
  mime_type: z.string().optional(),
  file_hash: z.string().min(1),
})

/** Resolve the signed-in user from cookies or an Authorization bearer token. */
async function resolveAuthedClient(req: Request): Promise<{
  supabase: SupabaseClient
  userId: string
} | null> {
  const cookieClient = await createClient()
  const {
    data: { user: cookieUser },
    error: cookieError,
  } = await cookieClient.auth.getUser()

  if (!cookieError && cookieUser) {
    return { supabase: cookieClient, userId: cookieUser.id }
  }

  const authHeader = req.headers.get('authorization')
  const accessToken = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!accessToken) return null

  const bearerClient = createBearerClient(accessToken)
  const {
    data: { user: bearerUser },
    error: bearerError,
  } = await bearerClient.auth.getUser(accessToken)

  if (bearerError || !bearerUser) return null
  return { supabase: bearerClient, userId: bearerUser.id }
}

/** Persist a Document Vault row after the browser uploaded bytes to storage. */
export async function POST(req: Request) {
  try {
    const authed = await resolveAuthedClient(req)
    if (!authed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { supabase: authedClient, userId } = authed
    const supabase = getPersistenceClient(authedClient)

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = CompleteUploadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid upload metadata' }, { status: 400 })
    }

    const upload = parsed.data
    if (!isUserOwnedDocumentPath(upload.file_path, userId)) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
    }

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('owner_user_id', userId)
      .single()

    if (companyError || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 400 })
    }

    const docType = upload.document_type

    const { data: existing, error: existingError } = await supabase
      .from('company_documents')
      .select('*')
      .eq('company_id', company.id)
      .eq('document_type', docType)
      .is('superseded_by', null)
      .maybeSingle()

    if (existingError) throw existingError

    const existingDoc = existing as CompanyDocumentRow | null
    if (existingDoc?.file_hash === upload.file_hash) {
      return NextResponse.json({ doc: existingDoc, duplicate: true })
    }

    const nextVersion = (existingDoc?.version ?? 0) + 1
    const { data: newRow, error: insertError } = await supabase
      .from('company_documents')
      .insert({
        company_id: company.id,
        document_type: docType,
        file_path: upload.file_path,
        file_name: upload.file_name,
        file_size: upload.file_size,
        mime_type: upload.mime_type || 'application/octet-stream',
        file_hash: upload.file_hash,
        version: nextVersion,
        extracted_fields: {},
      })
      .select()
      .single()

    if (insertError) {
      await authedClient.storage.from('documents').remove([upload.file_path])
      throw insertError
    }

    if (existingDoc) {
      const { error: supersedeError } = await supabase
        .from('company_documents')
        .update({ superseded_by: newRow.id })
        .eq('id', existingDoc.id)

      if (supersedeError) throw supersedeError
    }

    return NextResponse.json({ doc: newRow, duplicate: false })
  } catch (err) {
    console.error('Document upload complete failed:', err)
    return NextResponse.json({ error: getUploadErrorMessage(err) }, { status: 500 })
  }
}
