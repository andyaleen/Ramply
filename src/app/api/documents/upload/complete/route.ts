import { NextResponse } from 'next/server'
import { z } from 'zod'

import { CATALOG_DOCUMENT_TYPES, type DocumentTypeKey } from '@/lib/catalog'
import { requireAppSession } from '@/lib/auth/require-app-session'
import { getUploadErrorMessage, isUserOwnedDocumentPath } from '@/lib/document-upload'
import { createAdminClient } from '@/lib/supabase/admin'
import { createBearerClient } from '@/lib/supabase/bearer'
import { persistVaultUploadRow } from '@/lib/persist-vault-upload-row'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

const docTypeKeys = CATALOG_DOCUMENT_TYPES.map((doc) => doc.key) as [
  DocumentTypeKey,
  ...DocumentTypeKey[],
]

const CompleteUploadSchema = z.object({
  document_type: z.enum(docTypeKeys),
  file_path: z.string().min(1),
  file_name: z.string().min(1),
  file_size: z.coerce.number().int().nonnegative(),
  mime_type: z.string().optional(),
  file_hash: z.string().min(1),
})

/** Prefer service-role writes after auth checks so vault inserts are reliable. */
function getPersistenceClient(fallback: SupabaseClient): SupabaseClient {
  try {
    return createAdminClient()
  } catch {
    return fallback
  }
}

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
    const session = await requireAppSession(cookieClient, cookieUser)
    if (!session.ok) return null
    return { supabase: cookieClient, userId: session.user.id }
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

  const session = await requireAppSession(bearerClient, bearerUser)
  if (!session.ok) return null

  return { supabase: bearerClient, userId: session.user.id }
}

/** Persist a Document Vault row after the browser uploaded bytes to storage. */
export async function POST(req: Request) {
  try {
    const authed = await resolveAuthedClient(req)
    if (!authed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { supabase: authedClient, userId } = authed

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

    const result = await persistVaultUploadRow(
      authedClient,
      getPersistenceClient(authedClient),
      userId,
      {
        ...upload,
        mime_type: upload.mime_type || 'application/octet-stream',
      }
    )

    return NextResponse.json(result)
  } catch (err) {
    console.error('Document upload complete failed:', err)
    return NextResponse.json({ error: getUploadErrorMessage(err) }, { status: 500 })
  }
}
