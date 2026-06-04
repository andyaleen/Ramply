import { Resend } from 'resend'
import { readEnv } from '@/lib/env'

export interface PasswordResetEmailParams {
  recipientEmail: string
  resetLink: string
}

export type PasswordResetEmailResult =
  | { ok: true; id?: string }
  | { ok: false; reason: string }

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function getResendFromAddress(): string {
  return readEnv('RESEND_FROM') || 'Ramply <onboarding@resend.dev>'
}

/**
 * Builds HTML for a password reset email with a direct token_hash callback link.
 */
export function buildPasswordResetHtml({ resetLink }: Pick<PasswordResetEmailParams, 'resetLink'>): string {
  const safeLink = escapeHtml(resetLink)
  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#F6F4EE;font-family:Arial,Helvetica,sans-serif;color:#0F1F18;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F6F4EE;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #DDDCD5;border-radius:16px;">
            <tr>
              <td style="padding:32px;text-align:center;">
                <h1 style="margin:0 0 12px;font-size:24px;">Reset your Ramply password</h1>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#5D6D66;">
                  Click the button below to choose a new password. This link expires soon.
                </p>
                <a href="${safeLink}" style="display:inline-block;background:#287253;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 24px;border-radius:10px;">
                  Set a new password
                </a>
                <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#7A8C84;word-break:break-all;">
                  Or copy this link: ${safeLink}
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

/**
 * Sends a password reset email via Resend.
 */
export async function sendPasswordResetEmail(
  params: PasswordResetEmailParams
): Promise<PasswordResetEmailResult> {
  const apiKey = readEnv('RESEND_API_KEY')
  if (!apiKey) {
    return { ok: false, reason: 'Email service not configured' }
  }

  const resend = new Resend(apiKey)
  const { data, error } = await resend.emails.send({
    from: getResendFromAddress(),
    to: [params.recipientEmail.trim()],
    subject: 'Reset your Ramply password',
    html: buildPasswordResetHtml(params),
  })

  if (error) {
    return { ok: false, reason: error.message || 'Failed to send password reset email' }
  }

  return { ok: true, id: data?.id }
}
