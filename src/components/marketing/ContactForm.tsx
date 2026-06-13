'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

/**
 * Public contact form that emails submissions to the Ramply inbox.
 */
export function ContactForm() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedEmail = email.trim()
    const trimmedMessage = message.trim()

    if (!trimmedEmail || !trimmedMessage) {
      toast.error('Please enter your email and message.')
      return
    }

    if (trimmedMessage.length < 10) {
      toast.error('Please enter a message with at least 10 characters.')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          message: trimmedMessage,
        }),
      })

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null

      if (!response.ok) {
        toast.error(payload?.error || 'Failed to send your message. Please try again.')
        return
      }

      toast.success('Thanks for reaching out. We will get back to you soon.')
      setEmail('')
      setMessage('')
    } catch {
      toast.error('Unable to send your message right now. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="contact-email" className="text-[#0F1F18]">
          Email
        </Label>
        <Input
          id="contact-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          required
          className="h-12 rounded-xl border-[#DDDCD5] bg-white text-[#0F1F18]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-message" className="text-[#0F1F18]">
          Message
        </Label>
        <Textarea
          id="contact-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="How can we help?"
          required
          rows={8}
          maxLength={5000}
          className="min-h-[180px] rounded-xl border-[#DDDCD5] bg-white text-[#0F1F18] resize-y"
        />
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="h-12 rounded-xl bg-[#287253] px-8 text-[16px] font-medium text-white hover:bg-[#1A4D38]"
      >
        {submitting ? 'Sending…' : 'Submit'}
      </Button>
    </form>
  )
}
