'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BookTemplate, FilePlus2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { fetchRequestTemplates, requestTemplatesQueryKey } from '@/lib/request-templates'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface CreateShareRequestChooserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStartNew: () => void
  onSelectTemplate: (templateId: string) => void
}

/**
 * First step when creating a share request: start blank or from a saved template.
 */
export function CreateShareRequestChooserDialog({
  open,
  onOpenChange,
  onStartNew,
  onSelectTemplate,
}: CreateShareRequestChooserDialogProps) {
  const [step, setStep] = useState<'method' | 'template'>('method')
  const { company } = useAuth()
  const { data: templates = [], isLoading } = useQuery({
    queryKey: requestTemplatesQueryKey(company?.id),
    queryFn: fetchRequestTemplates,
    enabled: open && !!company?.id,
  })

  useEffect(() => {
    if (!open) setStep('method')
  }, [open])

  function close() {
    onOpenChange(false)
  }

  function handleStartNew() {
    close()
    onStartNew()
  }

  function handleFromTemplate() {
    if (isLoading) return
    if (templates.length === 0) {
      toast.error('No saved templates yet. Start a new request and save it as a template.')
      return
    }
    setStep('template')
  }

  function handleTemplateSelect(templateId: string) {
    close()
    onSelectTemplate(templateId)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md sm:w-full">
        {step === 'method' ? (
          <>
            <DialogHeader>
              <DialogTitle>Create Share Request</DialogTitle>
              <DialogDescription>Choose how you want to build this request.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="h-auto justify-start gap-3 px-4 py-4 text-left"
                onClick={handleFromTemplate}
                disabled={isLoading}
              >
                <BookTemplate className="h-5 w-5 shrink-0 text-[#287253]" />
                <span>
                  <span className="block font-medium">From Template</span>
                  <span className="block text-sm font-normal text-muted-foreground">
                    Use a saved bundle of fields and documents
                  </span>
                </span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-auto justify-start gap-3 px-4 py-4 text-left"
                onClick={handleStartNew}
              >
                <FilePlus2 className="h-5 w-5 shrink-0 text-[#287253]" />
                <span>
                  <span className="block font-medium">Start New</span>
                  <span className="block text-sm font-normal text-muted-foreground">
                    Pick fields and documents from scratch
                  </span>
                </span>
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Choose a Template</DialogTitle>
              <DialogDescription>Select a saved template for this request.</DialogDescription>
            </DialogHeader>
            <div className="max-h-64 space-y-2 overflow-y-auto pt-2">
              {templates.map((template) => (
                <Button
                  key={template.id}
                  type="button"
                  variant="outline"
                  className="h-auto w-full justify-start px-4 py-3 text-left"
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  <span className="font-medium">{template.name}</span>
                </Button>
              ))}
            </div>
            <Button type="button" variant="ghost" onClick={() => setStep('method')}>
              Back
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
