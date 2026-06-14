import { NextResponse } from 'next/server'
import { reportServerError } from '@/lib/monitoring'

type RpcErrorConfig = {
  status: number
  message: string
}

/** Known Postgres RPC exception codes mapped to safe client messages. */
const RPC_ERROR_CODES: Record<string, RpcErrorConfig> = {
  share_request_not_allowed: {
    status: 403,
    message: 'You cannot modify this share request.',
  },
  company_not_found: {
    status: 400,
    message: 'Company not found.',
  },
  unauthorized: {
    status: 403,
    message: 'Unauthorized.',
  },
  invalid_document_type: {
    status: 400,
    message: 'Invalid document type.',
  },
  invalid_file_path: {
    status: 400,
    message: 'Invalid file path.',
  },
  invalid_field_key: {
    status: 400,
    message: 'Invalid field selection.',
  },
  missing_mandatory_documents: {
    status: 400,
    message: 'Required documents are missing.',
  },
  invalid_document_ids: {
    status: 400,
    message: 'Invalid document selection.',
  },
  not_authenticated: {
    status: 401,
    message: 'Unauthorized.',
  },
}

function getErrorMessage(error: unknown): string | undefined {
  if (typeof error === 'object' && error && 'message' in error) {
    const message = (error as { message?: unknown }).message
    return typeof message === 'string' ? message : undefined
  }
  return undefined
}

/** Returns a mapped RPC error config when the raw message contains a known code. */
export function resolveRpcError(rawMessage: string | undefined): RpcErrorConfig | null {
  if (!rawMessage) return null

  for (const [code, config] of Object.entries(RPC_ERROR_CODES)) {
    if (rawMessage.includes(code)) return config
  }

  return null
}

/** Maps a Postgres RPC error to a safe client response; logs unexpected failures. */
export function rpcErrorResponse(
  context: string,
  error: unknown,
  fallbackMessage = 'Something went wrong. Please try again.',
): NextResponse {
  const mapped = resolveRpcError(getErrorMessage(error))
  if (mapped) {
    if (mapped.status >= 500) {
      reportServerError(context, error)
    }
    return NextResponse.json({ error: mapped.message }, { status: mapped.status })
  }

  reportServerError(context, error)
  return NextResponse.json({ error: fallbackMessage }, { status: 500 })
}

/** Maps a Supabase query error to a safe response; logs server-side details. */
export function databaseErrorResponse(
  context: string,
  error: unknown,
  fallbackMessage = 'Something went wrong. Please try again.',
): NextResponse {
  const mapped = resolveRpcError(getErrorMessage(error))
  if (mapped && mapped.status < 500) {
    return NextResponse.json({ error: mapped.message }, { status: mapped.status })
  }

  reportServerError(context, error)
  return NextResponse.json({ error: fallbackMessage }, { status: 500 })
}

/** Generic message for email delivery failures returned to API clients. */
export const EMAIL_DELIVERY_FAILED_MESSAGE =
  'Email could not be sent. Please try again later.'
