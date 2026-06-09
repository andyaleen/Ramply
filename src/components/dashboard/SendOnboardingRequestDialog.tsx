'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ShareRequestSchema, type ShareRequest } from '@/lib/validations'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Copy, Zap, BookTemplate, Send } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import type { RequestTemplateRow } from '@/lib/database.types'
import { fetchRequestTemplates, saveRequestTemplate } from '@/lib/request-templates'
import { TemplateSelectionsForm } from '@/components/templates/TemplateSelectionsForm'

interface SendOnboardingRequestDialogProps {
  open: boolean
  initialTemplateId?: string | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function SendOnboardingRequestDialog({
  open,
  initialTemplateId,
  onOpenChange,
  onSuccess,
}: SendOnboardingRequestDialogProps) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [createdForEmail, setCreatedForEmail] = useState<string | null>(null)
  const [inviteEmailSent, setInviteEmailSent] = useState<boolean | null>(null)
  const [inviteEmailError, setInviteEmailError] = useState<string | null>(null)
  const [limitReason, setLimitReason] = useState<'free_tier_limit' | 'classic_monthly_limit' | null>(null)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)

  const { data: templates = [] } = useQuery<RequestTemplateRow[]>({
    queryKey: ['request-templates'],
    queryFn: fetchRequestTemplates,
    enabled: open,
  })

  const form = useForm<ShareRequest>({
    resolver: zodResolver(ShareRequestSchema),
    defaultValues: {
      request_type: '',
      recipient_email: '',
      mandatory_fields: [],
      optional_fields: [],
      mandatory_documents: [],
      optional_documents: [],
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: ShareRequest) => {
      const res = await fetch('/api/share-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        if (
          res.status === 402 &&
          (err.error === 'free_tier_limit' || err.error === 'classic_monthly_limit')
        ) {
          setLimitReason(err.error)
          throw new Error(err.error)
        }
        throw new Error(err.error ?? 'Failed to create share request')
      }
      return res.json() as Promise<{
        link: string
        recipient_email: string
        request_type: string
        email_sent?: boolean
        email_error?: string
      }>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['share-requests'] })
      queryClient.invalidateQueries({ queryKey: ['pending-sent-requests'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setGeneratedLink(data.link)
      setCreatedForEmail(data.recipient_email)
      setInviteEmailSent(data.email_sent ?? false)
      setInviteEmailError(data.email_error ?? null)
      if (data.email_sent) {
        toast.success(`Invite email sent to ${data.recipient_email}`)
      } else {
        toast.success('Share request created!')
      }
    },
    onError: (error) => {
      if (
        (error as Error).message === 'free_tier_limit' ||
        (error as Error).message === 'classic_monthly_limit'
      ) return
      console.error('Failed to create share request:', error)
      toast.error('Failed to create share request. Please try again.')
    },
  })

  const copyLink = async () => {
    if (!generatedLink) return
    try {
      await navigator.clipboard.writeText(generatedLink)
      toast.success('Link copied to clipboard!')
    } catch {
      toast.error('Failed to copy link.')
    }
  }

  const handleClose = () => {
    form.reset()
    setGeneratedLink(null)
    setCreatedForEmail(null)
    setInviteEmailSent(null)
    setInviteEmailError(null)
    setLimitReason(null)
    setShowSaveTemplate(false)
    setTemplateName('')
    onOpenChange(false)
    if (generatedLink) onSuccess()
  }

  /** Populate or reset the form when the dialog opens. */
  useEffect(() => {
    if (!open) return

    if (!initialTemplateId) {
      form.reset({
        request_type: '',
        recipient_email: '',
        mandatory_fields: [],
        optional_fields: [],
        mandatory_documents: [],
        optional_documents: [],
      })
      return
    }

    const template = templates.find((entry) => entry.id === initialTemplateId)
    if (!template) return

    form.reset({
      request_type: template.name?.trim() ?? '',
      recipient_email: '',
      mandatory_fields: template.mandatory_fields ?? [],
      optional_fields: template.optional_fields ?? [],
      mandatory_documents: template.mandatory_documents ?? [],
      optional_documents: template.optional_documents ?? [],
    })
  }, [form, open, initialTemplateId, templates])

  /** Save the current field/doc selection as a new template. */
  async function saveAsTemplate() {
    const name = templateName.trim()
    if (!name) { toast.error('Template name is required'); return }
    setSavingTemplate(true)
    try {
      const {
        mandatory_fields,
        optional_fields,
        mandatory_documents,
        optional_documents,
      } = form.getValues()
      await saveRequestTemplate({
        name,
        mandatory_fields,
        optional_fields,
        mandatory_documents,
        optional_documents,
      })
      await queryClient.invalidateQueries({ queryKey: ['request-templates'] })
      toast.success(`Template "${name}" saved`)
      setTemplateName('')
      setShowSaveTemplate(false)
    } catch {
      toast.error('Failed to save template. Please try again.')
    } finally {
      setSavingTemplate(false)
    }
  }

  const usingSavedTemplate = Boolean(initialTemplateId)
  const submitLabel = createMutation.isPending ? 'Sending…' : 'Send Request'

  if (limitReason) {
    const isClassicLimit = limitReason === 'classic_monthly_limit'
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              {isClassicLimit ? 'Upgrade to Ramply Pro' : 'Choose a plan'}
            </DialogTitle>
            <DialogDescription>
              {isClassicLimit
                ? 'You have used all 20 share requests included with Classic this month. Upgrade to Ramply Pro for unlimited requests.'
                : 'You have used all 3 free share requests. Subscribe to Classic or Ramply Pro to keep sending onboarding requests.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button onClick={() => { handleClose(); router.push(isClassicLimit ? '/dashboard/billing' : '/pricing') }}>
              View Plans
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {generatedLink
              ? inviteEmailSent
                ? 'Request Sent'
                : 'Link Generated'
              : usingSavedTemplate
                ? 'Send Share Request'
                : 'New Share Request'}
          </DialogTitle>
          <DialogDescription>
            {generatedLink
              ? inviteEmailSent
                ? 'We emailed the recipient. You can also copy the link below if needed.'
                : 'Share this link with the recipient to complete the request.'
              : 'Set the type of request and choose what information you need from the recipient.'}
          </DialogDescription>
        </DialogHeader>

        {generatedLink ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input value={generatedLink} readOnly className="font-mono text-sm" />
              <Button onClick={copyLink} variant="outline" size="icon">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {createdForEmail && (
              <p className="text-sm text-muted-foreground">
                Recipient: <strong>{createdForEmail}</strong>
                {inviteEmailSent
                  ? ' — invite email sent. They must sign up or sign in with this address to fulfill the request.'
                  : inviteEmailError
                    ? ` — invite email was not sent (${inviteEmailError}). Copy the link below.`
                    : ' — they must sign up or sign in with this email to fulfill the request.'}
              </p>
            )}
            <p className="text-sm text-muted-foreground">This link expires in 30 days.</p>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(v => createMutation.mutate(v))} className="space-y-5">

              <FormField control={form.control} name="request_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type of Request *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="example: Standard, Insurance, Higher Credit Limit, etc"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="recipient_email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient Email *</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="vendor@company.com"
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <TemplateSelectionsForm form={form} />

              {showSaveTemplate && (
                <FormItem>
                  <FormLabel htmlFor="template-name">Template name</FormLabel>
                  <Input
                    id="template-name"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g. Standard vendor onboarding"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void saveAsTemplate()
                      }
                    }}
                  />
                </FormItem>
              )}

              <DialogFooter className="gap-2 sm:gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                {!usingSavedTemplate && (
                  <Button
                    type="button"
                    disabled={savingTemplate}
                    variant="outline"
                    className="border-[#287253] text-[#287253] hover:bg-[#F7F8F4]"
                    onClick={() => {
                      if (!showSaveTemplate) {
                        setShowSaveTemplate(true)
                        return
                      }
                      void saveAsTemplate()
                    }}
                  >
                    <BookTemplate className="h-4 w-4 mr-2" />
                    {savingTemplate ? 'Saving…' : 'Save Template'}
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className={usingSavedTemplate ? 'bg-[#287253] text-white hover:bg-[#1A4D38]' : undefined}
                >
                  {usingSavedTemplate ? <Send className="h-4 w-4 mr-2" /> : null}
                  {submitLabel}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}

