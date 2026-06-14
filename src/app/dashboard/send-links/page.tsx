'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { CreateShareRequestChooserDialog } from '@/components/dashboard/CreateShareRequestChooserDialog'
import { PendingSentRequestsPanel } from '@/components/dashboard/PendingSentRequestsPanel'
import { SavedRequestTemplatesPanel } from '@/components/dashboard/SavedRequestTemplatesPanel'
import { SendOnboardingRequestDialog } from '@/components/dashboard/SendOnboardingRequestDialog'

export default function SendLinksPage() {
  const [showChooser, setShowChooser] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  useEffect(() => {
    if (window.location.hash === '#pending-requests') {
      document.getElementById('pending-requests')?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  function openChooser() {
    setShowChooser(true)
  }

  function openNewRequest(templateId: string | null = null) {
    setSelectedTemplateId(templateId)
    setShowDialog(true)
  }

  return (
    <div className="flex-1 min-w-0 space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Send Requests</h1>
        <Button onClick={openChooser} className="flex w-full shrink-0 items-center justify-center gap-2 sm:w-auto">
          <Plus className="h-4 w-4" />
          Create Share Request
        </Button>
      </div>

      <SavedRequestTemplatesPanel onUseTemplate={(templateId) => openNewRequest(templateId)} />

      <PendingSentRequestsPanel />

      <CreateShareRequestChooserDialog
        open={showChooser}
        onOpenChange={setShowChooser}
        onStartNew={() => openNewRequest(null)}
        onSelectTemplate={(templateId) => openNewRequest(templateId)}
      />

      <SendOnboardingRequestDialog
        open={showDialog}
        initialTemplateId={selectedTemplateId}
        onOpenChange={(open) => {
          setShowDialog(open)
          if (!open) setSelectedTemplateId(null)
        }}
        onSuccess={() => {
          setShowDialog(false)
          setSelectedTemplateId(null)
        }}
      />
    </div>
  )
}
