'use client'

import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Copy, Gift, Send } from 'lucide-react'
import { toast } from 'sonner'

interface ReferralInfo {
  link: string
  referrer_name: string
  company_name: string
}

export default function ReferralPage() {
  const { profileLoading } = useAuth()
  const [recipientEmail, setRecipientEmail] = useState('')

  const { data: referral, isLoading } = useQuery<ReferralInfo>({
    queryKey: ['referral-link'],
    queryFn: async () => {
      const res = await fetch('/api/referrals', { credentials: 'include' })
      if (!res.ok) {
        throw new Error('Failed to load referral link')
      }
      return res.json() as Promise<ReferralInfo>
    },
    enabled: !profileLoading,
  })

  const sendMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch('/api/referrals/send', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_email: email }),
      })
      const payload = await res.json().catch(() => ({})) as {
        error?: string
        email_sent?: boolean
        dev_logged?: boolean
        link?: string
      }
      if (!res.ok) {
        const error = new Error(payload.error ?? 'Failed to send referral email') as Error & {
          referralLink?: string
        }
        error.referralLink = payload.link
        throw error
      }
      return payload
    },
    onSuccess: (payload) => {
      const email = recipientEmail.trim()
      if (payload.dev_logged) {
        toast.success(`Referral logged in dev mode for ${email}. Check your terminal for the link.`)
      } else {
        toast.success(`Referral email sent to ${email}`)
      }
      setRecipientEmail('')
    },
    onError: (error) => {
      const referralLink = (error as Error & { referralLink?: string }).referralLink
      const message = error instanceof Error ? error.message : 'Failed to send referral email'
      if (referralLink) {
        toast.warning('Email could not be sent. Copy your referral link above and send it manually.', {
          id: 'referral-send-failed',
          description: message,
        })
        return
      }
      toast.error(message, { id: 'referral-send-failed' })
    },
  })

  const copyLink = async () => {
    if (!referral?.link) return
    try {
      await navigator.clipboard.writeText(referral.link)
      toast.success('Referral link copied to clipboard!')
    } catch {
      toast.error('Failed to copy link.')
    }
  }

  const handleSendEmail = (event: React.FormEvent) => {
    event.preventDefault()
    const email = recipientEmail.trim()
    if (!email) {
      toast.error('Enter an email address to send the referral.')
      return
    }
    sendMutation.mutate(email)
  }

  return (
    <div className="container mx-auto py-10 max-w-3xl px-6">
      <h1 className="text-3xl font-bold mb-6">Referral</h1>

      {profileLoading || isLoading ? (
        <ReferralSkeleton />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Gift className="h-5 w-5 text-[#287253]" aria-hidden />
              Share Ramply with a partner
            </CardTitle>
            <CardDescription>
              Asked for information from someone not on Ramply? Send them this link to get started!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Successful referrals get a free month credit.
            </p>

            <div className="space-y-2">
              <label htmlFor="referral-link" className="text-sm font-medium">
                Your referral link
              </label>
              <div className="flex gap-2">
                <Input
                  id="referral-link"
                  readOnly
                  value={referral?.link ?? ''}
                  className="font-mono text-sm"
                />
                <Button type="button" variant="outline" onClick={copyLink} disabled={!referral?.link}>
                  <Copy className="h-4 w-4 mr-2" aria-hidden />
                  Copy
                </Button>
              </div>
            </div>

            <form onSubmit={handleSendEmail} className="space-y-3 border-t pt-6">
              <label htmlFor="referral-email" className="text-sm font-medium">
                Or send by email
              </label>
              <Input
                id="referral-email"
                type="email"
                placeholder="partner@company.com"
                value={recipientEmail}
                onChange={(event) => setRecipientEmail(event.target.value)}
                autoComplete="email"
              />
              <Button
                type="submit"
                className="bg-[#287253] text-white hover:bg-[#1A4D38]"
                disabled={sendMutation.isPending || !recipientEmail.trim()}
              >
                <Send className="h-4 w-4 mr-2" aria-hidden />
                {sendMutation.isPending ? 'Sending...' : 'Send Email'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ReferralSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-32" />
      </CardContent>
    </Card>
  )
}
