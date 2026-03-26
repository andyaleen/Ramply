'use client'

import { useState } from 'react'
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
import { Copy, Zap, BookTemplate } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import type { RequestTemplateRow } from '@/lib/database.types'
import { TemplateSelectionsForm } from '@/components/templates/TemplateSelectionsForm'
import { TemplatePicker } from '@/components/templates/TemplatePicker'

interface SendOnboardingRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function SendOnboardingRequestDialog({
  open,
  onOpenChange,
  onSuccess,
}: SendOnboardingRequestDialogProps) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [atLimit, setAtLimit] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)

  const { data: templates = [] } = useQuery<RequestTemplateRow[]>({
    queryKey: ['request-templates'],
    queryFn: async () => {
      const res = await fetch('/api/templates')
      if (!res.ok) return []
      return res.json() as Promise<RequestTemplateRow[]>
    },
    enabled: open,
  })

  const form = useForm<ShareRequest>({
    resolver: zodResolver(ShareRequestSchema),
    defaultValues: {
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
        if (res.status === 402 || err.error === 'free_tier_limit') {
          setAtLimit(true)
          throw new Error('free_tier_limit')
        }
        throw new Error(err.error ?? 'Failed to create share request')
      }
      return res.json() as Promise<{ link: string }>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['share-requests'] })
      setGeneratedLink(data.link)
      toast.success('Share request created!')
    },
    onError: (error) => {
      if ((error as Error).message === 'free_tier_limit') return // handled by atLimit state
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
    setAtLimit(false)
    onOpenChange(false)
    if (generatedLink) onSuccess()
  }

  /** Populate the form with a saved template's fields/docs. */
  function applyTemplate(template: RequestTemplateRow) {
    form.setValue('mandatory_fields', template.mandatory_fields ?? [])
    form.setValue('optional_fields', template.optional_fields ?? [])
    form.setValue('mandatory_documents', template.mandatory_documents ?? [])
    form.setValue('optional_documents', template.optional_documents ?? [])
    toast.success(`Template "${template.name}" applied`)
  }

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
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          mandatory_fields,
          optional_fields,
          mandatory_documents,
          optional_documents,
        }),
      })
      if (!res.ok) throw new Error('Failed to save template')
      queryClient.invalidateQueries({ queryKey: ['request-templates'] })
      toast.success(`Template "${name}" saved`)
      setTemplateName('')
      setShowSaveTemplate(false)
    } catch {
      toast.error('Failed to save template. Please try again.')
    } finally {
      setSavingTemplate(false)
    }
  }

  /** Delete a template by ID. */
  async function deleteTemplate(id: string, name: string) {
    const res = await fetch(`/api/templates?id=${id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Failed to delete template'); return }
    queryClient.invalidateQueries({ queryKey: ['request-templates'] })
    toast.success(`Template "${name}" deleted`)
  }

  if (atLimit) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              Upgrade to Pro
            </DialogTitle>
            <DialogDescription>
              You have reached the free tier limit of 3 connected companies.
              Upgrade to Ramply Pro for unlimited connections.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button onClick={() => { handleClose(); router.push('/admin/billing') }}>
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
          <DialogTitle>{generatedLink ? 'Link Generated' : 'New Share Request'}</DialogTitle>
          <DialogDescription>
            {generatedLink
              ? 'Share this link with your recipient. An invite email has been sent.'
              : 'Choose what information you need from the recipient.'}
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
            <p className="text-sm text-muted-foreground">This link expires in 30 days.</p>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(v => createMutation.mutate(v))} className="space-y-5">

              <TemplatePicker
                templates={templates}
                onApply={applyTemplate}
                onDelete={(template) => deleteTemplate(template.id, template.name)}
              />

              <FormField control={form.control} name="recipient_email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient Email *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="vendor@company.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <TemplateSelectionsForm form={form} />

              {/* Save as template */}
              <div className="border-t pt-3 space-y-2">
                {showSaveTemplate ? (
                  <div className="flex gap-2">
                    <Input
                      value={templateName}
                      onChange={e => setTemplateName(e.target.value)}
                      placeholder="Template name…"
                      className="flex-1 text-sm"
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveAsTemplate() } }}
                    />
                    <Button type="button" size="sm" onClick={saveAsTemplate} disabled={savingTemplate}>
                      {savingTemplate ? 'Saving…' : 'Save'}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setShowSaveTemplate(false)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    onClick={() => setShowSaveTemplate(true)}
                  >
                    <BookTemplate className="h-3 w-3" />
                    Save current selection as template
                  </button>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create & Send'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}

