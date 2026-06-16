import { deliverResendEmail } from '@/lib/email/resend-delivery'
import { readEnv } from '@/lib/env'
import { LEGAL_SITE } from '@/lib/legal/site'

export interface ContactFormEmailParams {
  senderEmail: string
  message: string
}

export type ContactFormEmailResult =
  | { ok: true; id?: string; devLogged?: boolean }
  | { ok: false; reason: string }

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Resolves the inbox that receives public contact form submissions. */
export function getContactFormRecipientEmail(): string {
  return readEnv('CONTACT_FORM_TO_EMAIL') || LEGAL_SITE.contactEmail
}

/** Builds the HTML body for a contact form notification email. */
export function buildContactFormHtml({
  senderEmail,
  message,
}: ContactFormEmailParams): string {
  const safeSender = escapeHtml(senderEmail)
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br />')

  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#0F1F18;">
    <h1 style="margin:0 0 16px;font-size:20px;">New Ramply contact form message</h1>
    <p style="margin:0 0 8px;"><strong>From:</strong> ${safeSender}</p>
    <p style="margin:0 0 16px;"><strong>Reply to this email to respond directly.</strong></p>
    <div style="padding:16px;border:1px solid #DDDCD5;border-radius:12px;background:#F9F8F4;">
      <p style="margin:0;white-space:pre-wrap;line-height:1.6;">${safeMessage}</p>
    </div>
  </body>
</html>`
}

/** Sends a contact form submission to the configured Ramply inbox. */
export async function sendContactFormEmail(
  params: ContactFormEmailParams
): Promise<ContactFormEmailResult> {
  const recipientEmail = getContactFormRecipientEmail()

  return deliverResendEmail({
    to: recipientEmail,
    replyTo: params.senderEmail,
    subject: `Ramply contact form: ${params.senderEmail}`,
    html: buildContactFormHtml(params),
    context: 'contact-form',
  })
}
