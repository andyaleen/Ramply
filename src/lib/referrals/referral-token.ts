import { createHmac, timingSafeEqual } from 'crypto'
import { readEnv } from '@/lib/env'

const TOKEN_VERSION = 'v1'

function getReferralSecret(): string {
  return (
    readEnv('REFERRAL_TOKEN_SECRET')
    ?? readEnv('SUPABASE_SERVICE_ROLE_KEY')
    ?? 'dev-referral-secret'
  )
}

/** Creates a signed referral token for a referrer company. */
export function createReferralToken(companyId: string): string {
  const payload = `${TOKEN_VERSION}.${companyId}`
  const signature = createHmac('sha256', getReferralSecret())
    .update(payload)
    .digest('base64url')
  return `${payload}.${signature}`
}

/** Returns the referrer company id when the token is valid. */
export function verifyReferralToken(token: string): string | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [version, companyId, signature] = parts
  if (version !== TOKEN_VERSION || !companyId) return null

  const payload = `${version}.${companyId}`
  const expected = createHmac('sha256', getReferralSecret())
    .update(payload)
    .digest('base64url')

  try {
    if (
      signature.length !== expected.length
      || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    ) {
      return null
    }
  } catch {
    return null
  }

  return companyId
}
