'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Plus, Send } from 'lucide-react'
import { PendingReceivedRequestsPanel } from '@/components/dashboard/PendingReceivedRequestsPanel'
import { SavedRequestTemplatesPanel } from '@/components/dashboard/SavedRequestTemplatesPanel'
import { SendOnboardingRequestDialog } from '@/components/dashboard/SendOnboardingRequestDialog'

export default function SendLinksPage() {
  const router = useRouter()
  const [showDialog, setShowDialog] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  useEffect(() => {
    if (window.location.hash === '#pending-requests') {
      document.getElementById('pending-requests')?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  function openNewRequest(templateId: string | null = null) {
    setSelectedTemplateId(templateId)
    setShowDialog(true)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <Send className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Send Share Requests</h1>
            <p className="text-gray-600">Request company information and documents from vendors and partners</p>
          </div>
        </div>
        <Button onClick={() => openNewRequest()} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Request
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How it works</CardTitle>
          <CardDescription>
            Click <strong>New Request</strong> to select the information fields and documents you need from a recipient.
            They&apos;ll receive an email with a secure link to share their company profile with you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => openNewRequest()} size="lg">
            <Plus className="h-4 w-4 mr-2" />
            Create Share Request
          </Button>
        </CardContent>
      </Card>

      <SavedRequestTemplatesPanel
        onCreateNew={() => openNewRequest()}
        onUseTemplate={(templateId) => openNewRequest(templateId)}
      />

      <PendingReceivedRequestsPanel />

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
