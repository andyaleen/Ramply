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
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Send Requests</h1>
        <Button onClick={openChooser} className="flex shrink-0 items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Share Request
        </Button>
      </div>

      <SavedRequestTemplatesPanel onUseTemplate={(templateId) => openNewRequest(templateId)} />

      <PendingSentRequestsPanel onCreateRequest={openChooser} />

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
