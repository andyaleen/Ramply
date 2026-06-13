import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sendContactFormEmail } from '@/lib/email/contact-form'
import { reportServerError } from '@/lib/monitoring'
import { enforcePublicRateLimit } from '@/lib/rate-limit/public-rate-limits'

const ContactFormSchema = z.object({
  email: z.string().trim().email(),
  message: z.string().trim().min(10).max(5000),
})

/** Accepts public contact form submissions and emails them to the Ramply inbox. */
export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = ContactFormSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const rateLimit = await enforcePublicRateLimit(req, 'contact-form', {
    email: parsed.data.email,
  })
  if (!rateLimit.ok) {
    return rateLimit.response
  }

  try {
    const emailResult = await sendContactFormEmail({
      senderEmail: parsed.data.email,
      message: parsed.data.message,
    })

    if (!emailResult.ok) {
      reportServerError('contact-form.send-email', new Error(emailResult.reason))
      return NextResponse.json({ error: 'Failed to send your message. Please try again later.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    reportServerError('contact-form', err)
    return NextResponse.json({ error: 'Failed to send your message. Please try again later.' }, { status: 500 })
  }
}
