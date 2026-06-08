import { Resend } from 'resend'
import { readEnv } from '@/lib/env'

export interface ShareRequestDeniedEmailParams {
  requesterEmail: string
  requestType: string
  recipientEmail: string
  recipientCompanyName?: string | null
  responsesUrl: string
}

export type ShareRequestDeniedEmailResult =
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
 * Builds the HTML body for a share-request declined notification.
 */
export function buildShareRequestDeniedHtml({
  requestType,
  recipientEmail,
  recipientCompanyName,
  responsesUrl,
}: Omit<ShareRequestDeniedEmailParams, 'requesterEmail'>): string {
  const safeRequestType = escapeHtml(requestType)
  const safeRecipientEmail = escapeHtml(recipientEmail)
  const safeRecipientCompany = recipientCompanyName
    ? escapeHtml(recipientCompanyName)
    : safeRecipientEmail
  const safeResponsesUrl = escapeHtml(responsesUrl)

  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#F6F4EE;font-family:Arial,Helvetica,sans-serif;color:#0F1F18;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F6F4EE;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #DDDCD5;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 16px;text-align:center;">
                <div style="display:inline-block;width:48px;height:48px;border-radius:999px;background:#B42318;line-height:48px;color:#ffffff;font-size:24px;">×</div>
                <h1 style="margin:16px 0 8px;font-size:24px;line-height:1.3;">Share request declined</h1>
                <p style="margin:0;font-size:15px;line-height:1.6;color:#5D6D66;">
                  <strong>${safeRecipientCompany}</strong> declined your <strong>${safeRequestType}</strong> share request.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 24px;text-align:center;">
                <a href="${safeResponsesUrl}" style="display:inline-block;background:#287253;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 24px;border-radius:10px;">
                  View in Responses
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;text-align:center;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#7A8C84;">
                  You can review this update on your Responses tab in Ramply.
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
 * Notifies the requester that a recipient declined their share request.
 */
export async function sendShareRequestDeniedEmail(
  params: ShareRequestDeniedEmailParams
): Promise<ShareRequestDeniedEmailResult> {
  const apiKey = readEnv('RESEND_API_KEY')
  if (!apiKey) {
    return { ok: false, reason: 'Email service not configured' }
  }

  const requesterEmail = params.requesterEmail.trim()
  if (!requesterEmail) {
    return { ok: false, reason: 'Requester email is required' }
  }

  const resend = new Resend(apiKey)
  const subject = `Share request declined: ${params.requestType}`

  const { data, error } = await resend.emails.send({
    from: getResendFromAddress(),
    to: [requesterEmail],
    subject,
    html: buildShareRequestDeniedHtml(params),
  })

  if (error) {
    return { ok: false, reason: error.message || 'Failed to send declined notification' }
  }

  return { ok: true, id: data?.id }
}
