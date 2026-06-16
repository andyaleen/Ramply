import { describe, expect, test } from 'vitest'

import { buildContactFormHtml, getContactFormRecipientEmail } from '@/lib/email/contact-form'

describe('contact-form email', () => {
  test('escapes HTML in contact form notifications', () => {
    const html = buildContactFormHtml({
      senderEmail: 'test<script>@example.com',
      message: 'Hello <b>world</b>\nLine two',
    })

    expect(html).toContain('test&lt;script&gt;@example.com')
    expect(html).toContain('Hello &lt;b&gt;world&lt;/b&gt;')
    expect(html).toContain('Line two')
  })

  test('falls back to contact email when CONTACT_FORM_TO_EMAIL is unset', () => {
    const previous = process.env.CONTACT_FORM_TO_EMAIL
    delete process.env.CONTACT_FORM_TO_EMAIL

    expect(getContactFormRecipientEmail()).toBe('info@ramply.org')

    if (previous === undefined) {
      delete process.env.CONTACT_FORM_TO_EMAIL
    } else {
      process.env.CONTACT_FORM_TO_EMAIL = previous
    }
  })
})
