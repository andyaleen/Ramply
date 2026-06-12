import { deliverResendEmail } from '@/lib/email/resend-delivery'

export interface ReferralInviteEmailParams {
  recipientEmail: string
  referrerName: string
  companyName: string
  referralLink: string
}

export type ReferralInviteEmailResult =
  | { ok: true; id?: string; devLogged?: boolean }
  | { ok: false; reason: string }

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Builds the HTML body for a Ramply referral invite email. */
export function buildReferralInviteHtml({
  referrerName,
  companyName,
  referralLink,
}: Omit<ReferralInviteEmailParams, 'recipientEmail'>): string {
  const safeReferrer = escapeHtml(referrerName)
  const safeCompany = escapeHtml(companyName)
  const safeLink = escapeHtml(referralLink)

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
                <h1 style="margin:16px 0 8px;font-size:24px;line-height:1.3;">${safeReferrer} from ${safeCompany} invites you to use Ramply</h1>
                <p style="margin:0;font-size:15px;line-height:1.6;color:#5D6D66;">
                  Create your company profile once and share onboarding information securely whenever a company asks for it.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 24px;text-align:center;">
                <a href="${safeLink}" style="display:inline-block;background:#287253;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 24px;border-radius:10px;">
                  Get started with Ramply
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;text-align:center;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#7A8C84;word-break:break-all;">
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

/** Sends a referral invite email via Resend. */
export async function sendReferralInviteEmail(
  params: ReferralInviteEmailParams
): Promise<ReferralInviteEmailResult> {
  const subject = `${params.referrerName} from ${params.companyName} invites you to use Ramply`

  return deliverResendEmail({
    to: params.recipientEmail,
    subject,
    html: buildReferralInviteHtml(params),
    context: 'referral-invite',
  })
}
