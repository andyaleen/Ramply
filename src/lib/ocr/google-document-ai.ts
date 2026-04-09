import type { OcrInput, OcrResult } from './types'
import { createHash, createSign } from 'crypto'

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const GOOGLE_CLOUD_SCOPE = 'https://www.googleapis.com/auth/cloud-platform'

interface GoogleServiceAccount {
  client_email: string
  private_key: string
  project_id: string
}

interface CachedToken {
  token: string
  expiresAt: number
  fingerprint: string
}

let cachedToken: CachedToken | null = null

/** Parse service account JSON from env (raw JSON or base64). */
function parseServiceAccount(): GoogleServiceAccount {
  const raw = process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON
  if (!raw) {
    throw new Error('Missing GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON')
  }

  const json = raw.trim().startsWith('{')
    ? raw
    : Buffer.from(raw, 'base64').toString('utf8')

  const parsed = JSON.parse(json) as Partial<GoogleServiceAccount>
  if (!parsed.client_email || !parsed.private_key || !parsed.project_id) {
    throw new Error('Service account JSON missing required fields')
  }

  return {
    client_email: parsed.client_email,
    private_key: parsed.private_key,
    project_id: parsed.project_id,
  }
}

/** Base64url-encode a buffer or string. */
function base64UrlEncode(value: Buffer | string): string {
  const base64 = Buffer.isBuffer(value)
    ? value.toString('base64')
    : Buffer.from(value, 'utf8').toString('base64')
  return base64.replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

/** Build and sign a Google service account JWT for OAuth. */
function createSignedJwt(serviceAccount: GoogleServiceAccount, issuedAt: number, expiresAt: number): string {
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: serviceAccount.client_email,
    scope: GOOGLE_CLOUD_SCOPE,
    aud: GOOGLE_TOKEN_ENDPOINT,
    iat: issuedAt,
    exp: expiresAt,
  }

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const unsignedToken = `${encodedHeader}.${encodedPayload}`

  const signer = createSign('RSA-SHA256')
  signer.update(unsignedToken)
  const signature = signer.sign(serviceAccount.private_key)

  return `${unsignedToken}.${base64UrlEncode(signature)}`
}

/** Fetch an OAuth access token for Google APIs, cached in memory. */
async function fetchAccessToken(): Promise<string> {
  const serviceAccount = parseServiceAccount()
  const fingerprint = createHash('sha256')
    .update(serviceAccount.client_email)
    .update(serviceAccount.private_key)
    .digest('hex')

  const now = Math.floor(Date.now() / 1000)
  if (cachedToken && cachedToken.expiresAt - 60 > now && cachedToken.fingerprint === fingerprint) {
    return cachedToken.token
  }

  const issuedAt = now
  const expiresAt = now + 3600
  const assertion = createSignedJwt(serviceAccount, issuedAt, expiresAt)

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to fetch Google access token: ${response.status} ${errorText}`)
  }

  const data = await response.json() as { access_token: string; expires_in: number }
  cachedToken = {
    token: data.access_token,
    expiresAt: now + data.expires_in,
    fingerprint,
  }

  return data.access_token
}

/** Call Google Document AI OCR processor and return normalized OCR output. */
export async function processWithGoogleDocumentAi(input: OcrInput): Promise<OcrResult> {
  const explicitEndpoint = process.env.GOOGLE_DOCUMENT_AI_ENDPOINT?.trim()
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID
  const location = process.env.GOOGLE_CLOUD_LOCATION
  const processorId = process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID

  if (!explicitEndpoint && (!projectId || !location || !processorId)) {
    throw new Error('Missing Google Document AI configuration env vars')
  }

  const accessToken = await fetchAccessToken()
  const url = explicitEndpoint
    ?? `https://${location}-documentai.googleapis.com/v1/projects/${projectId}/locations/${location}/processors/${processorId}:process`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      rawDocument: {
        content: input.contentBase64,
        mimeType: input.mimeType,
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Document AI processing failed: ${response.status} ${errorText}`)
  }

  const data = await response.json() as { document?: { text?: string } }
  const rawText = data.document?.text ?? ''

  return {
    provider: 'google_document_ai',
    rawText,
    documentJson: data as Record<string, unknown>,
    metadata: {
      fileName: input.fileName,
      mimeType: input.mimeType,
      processorId,
      projectId,
      location,
      endpoint: explicitEndpoint,
    },
  }
}
