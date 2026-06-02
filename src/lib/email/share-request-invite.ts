import { Resend } from 'resend'
import { readEnv } from '@/lib/env'

export interface ShareRequestInviteParams {
  recipientEmail: string
  requesterName: string
  requestType: string
  shareLink: string
  fieldCount: number
  documentCount: number
  expiresInDays?: number
}

export type ShareRequestInviteResult =
  | { ok: true; id?: string }
  | { ok: false; reason: string }

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Builds the HTML body for a share-request invite email.
 */
export function buildShareRequestInviteHtml({
  requesterName,
  requestType,
  shareLink,
  fieldCount,
  documentCount,
  expiresInDays = 30,
}: Omit<ShareRequestInviteParams, 'recipientEmail'>): string {
  const safeRequester = escapeHtml(requesterName)
  const safeRequestType = escapeHtml(requestType)
  const safeShareLink = escapeHtml(shareLink)

  const itemParts: string[] = []
  if (fieldCount > 0) {
    itemParts.push(`${fieldCount} company field${fieldCount === 1 ? '' : 's'}`)
  }
  if (documentCount > 0) {
    itemParts.push(`${documentCount} document${documentCount === 1 ? '' : 's'}`)
  }
  const requestedSummary = itemParts.length > 0 ? itemParts.join(' and ') : 'company information'

  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#F6F4EE;font-family:Arial,Helvetica,sans-serif;color:#0F1F18;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F6F4EE;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #DDDCD5;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 16px;text-align:center;">
                <div style="display:inline-block;width:48px;height:48px;border-radius:999px;background:#287253;line-height:48px;color:#ffffff;font-size:24px;">✓</div>
                <h1 style="margin:16px 0 8px;font-size:24px;line-height:1.3;">Share request from ${safeRequester}</h1>
                <p style="margin:0;font-size:15px;line-height:1.6;color:#5D6D66;">
                  ${safeRequester} is requesting your company information for <strong>${safeRequestType}</strong>.
                  They need ${requestedSummary}.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 24px;text-align:center;">
                <a href="${safeShareLink}" style="display:inline-block;background:#287253;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 24px;border-radius:10px;">
                  Review and share information
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;text-align:center;">
                <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#7A8C84;">
                  This link expires in ${expiresInDays} days. Sign up or sign in with the email address this invite was sent to.
                </p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#7A8C84;word-break:break-all;">
                  Or copy this link: ${safeShareLink}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function getResendFromAddress(): string {
  return readEnv('RESEND_FROM') || 'Ramply <onboarding@resend.dev>'
}

/**
 * Sends a share-request invite email via Resend. Returns a structured result instead of throwing.
 */
export async function sendShareRequestInvite(
  params: ShareRequestInviteParams
): Promise<ShareRequestInviteResult> {
  const apiKey = readEnv('RESEND_API_KEY')
  if (!apiKey) {
    return { ok: false, reason: 'Email service not configured' }
  }

  const recipientEmail = params.recipientEmail.trim()
  if (!recipientEmail) {
    return { ok: false, reason: 'Recipient email is required' }
  }

  const resend = new Resend(apiKey)
  const subject = `${params.requesterName} is requesting your business information`

  const { data, error } = await resend.emails.send({
    from: getResendFromAddress(),
    to: [recipientEmail],
    subject,
    html: buildShareRequestInviteHtml(params),
  })

  if (error) {
    return { ok: false, reason: error.message || 'Failed to send invite email' }
  }

  return { ok: true, id: data?.id }
}
