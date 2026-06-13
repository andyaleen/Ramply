import { Resend } from 'resend'
import { readEnv } from '@/lib/env'

export interface ResendEmailPayload {
  to: string
  subject: string
  html: string
  /** Used in dev console logs to identify the email type. */
  context?: string
  /** Sets the Reply-To header so recipients can respond directly to the sender. */
  replyTo?: string
}

export type ResendDeliveryResult =
  | { ok: true; id?: string; devLogged?: boolean }
  | { ok: false; reason: string }

/** Returns the configured Resend sender address. */
export function getResendFromAddress(): string {
  return readEnv('RESEND_FROM') || 'Ramply <onboarding@resend.dev>'
}

/** Returns the configured Resend API key, if any. */
export function getResendApiKey(): string | undefined {
  return readEnv('RESEND_API_KEY')
}

/** True when local dev should log emails instead of failing on Resend errors. */
export function isDevEmailLogEnabled(): boolean {
  const flag = readEnv('EMAIL_DEV_LOG')
  if (flag === '1' || flag?.toLowerCase() === 'true') return true
  if (flag === '0' || flag?.toLowerCase() === 'false') return false
  return readEnv('NODE_ENV') === 'development'
}

/** Resend errors that should fall back to dev console logging instead of failing the flow. */
export function isDevEmailFallbackError(reason?: string): boolean {
  if (!reason) return true
  return (
    /api key is invalid|missing api key|unauthorized|401/i.test(reason)
    || /you can only send testing emails/i.test(reason)
    || /verify a domain at resend\.com/i.test(reason)
  )
}

function shouldLogEmailInsteadOfSending(reason?: string): boolean {
  if (!isDevEmailLogEnabled()) return false
  return isDevEmailFallbackError(reason)
}

function extractLinksFromHtml(html: string): string[] {
  const matches = html.matchAll(/href="([^"]+)"/g)
  return [...matches].map((match) => match[1]).filter(Boolean)
}

/** Writes a dev-mode email preview to the server console. */
function logDevEmail(payload: ResendEmailPayload, resendError?: string): void {
  const links = extractLinksFromHtml(payload.html)
  console.info('[email-dev-log]', {
    context: payload.context,
    resendError,
    to: payload.to,
    subject: payload.subject,
    links,
  })
}

/**
 * Sends an email through Resend, falling back to console logging in local dev
 * when Resend is missing, rejects the API key, or blocks non-sandbox recipients.
 */
export async function deliverResendEmail(
  payload: ResendEmailPayload
): Promise<ResendDeliveryResult> {
  const recipientEmail = payload.to.trim()
  if (!recipientEmail) {
    return { ok: false, reason: 'Recipient email is required' }
  }

  const apiKey = getResendApiKey()
  if (!apiKey) {
    if (isDevEmailLogEnabled()) {
      logDevEmail(payload)
      return { ok: true, devLogged: true }
    }
    return { ok: false, reason: 'Email service not configured' }
  }

  const resend = new Resend(apiKey)
  const { data, error } = await resend.emails.send({
    from: getResendFromAddress(),
    to: [recipientEmail],
    subject: payload.subject,
    html: payload.html,
    ...(payload.replyTo ? { reply_to: payload.replyTo } : {}),
  })

  if (error) {
    const reason = error.message || 'Failed to send email'
    if (shouldLogEmailInsteadOfSending(reason)) {
      logDevEmail(payload, reason)
      return { ok: true, devLogged: true }
    }
    return { ok: false, reason }
  }

  return { ok: true, id: data?.id }
}
