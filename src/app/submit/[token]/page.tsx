'use client'

import { Suspense, useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AuthForm } from '@/components/auth/AuthForm'
import { FulfillmentForm } from '@/components/onboarding/FulfillmentForm'
import { ShareRequestCompleteScreen } from '@/components/onboarding/ShareRequestCompleteScreen'
import type { ShareRequestRow } from '@/lib/database.types'
import { AlertCircle } from 'lucide-react'

type TemplatePreview = {
  id: string
  name: string
  mandatory_fields: string[]
  optional_fields: string[]
  mandatory_documents: string[]
  optional_documents: string[]
  requester_company_legal_name: string | null
}

type ShareRequestForFulfillment = Omit<ShareRequestRow, 'token'> & {
  requester_company_legal_name: string | null
}

function normalizeTemplatePreview(data: unknown): TemplatePreview | null {
  const row = (Array.isArray(data) ? data[0] : data) as TemplatePreview | null | undefined
  if (!row || typeof row !== 'object' || !row.id) return null

  return {
    ...row,
    name: row.name?.trim() || 'General Request',
    mandatory_fields: row.mandatory_fields ?? [],
    optional_fields: row.optional_fields ?? [],
    mandatory_documents: row.mandatory_documents ?? [],
    optional_documents: row.optional_documents ?? [],
  }
}

export default function TemplateSubmitPage() {
  const params = useParams()
  const token = params.token as string
  const { user, company, loading: authLoading } = useAuth()
  const supabase = createClient()
  const [completed, setCompleted] = useState(false)

  const { data: template, isLoading: templateLoading, error: templateError } = useQuery<TemplatePreview>({
    queryKey: ['request-template', token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_request_template_by_public_token', {
        p_public_token: token,
      })
      if (error) throw error

      const normalized = normalizeTemplatePreview(data)
      if (!normalized) throw new Error('Template not found')
      return normalized
    },
    enabled: !!token,
  })

  const {
    data: shareRequest,
    isLoading: submissionLoading,
    error: submissionError,
    refetch: refetchSubmission,
  } = useQuery<ShareRequestForFulfillment>({
    queryKey: ['template-submission', token, user?.id],
    queryFn: async () => {
      const res = await fetch('/api/template-submissions/ensure', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_token: token }),
      })

      const payload = (await res.json().catch(() => ({}))) as ShareRequestForFulfillment & {
        error?: string
        message?: string
      }

      if (!res.ok) {
        throw new Error(payload.message ?? payload.error ?? 'Failed to start submission')
      }

      return payload
    },
    enabled: !!token && !!user,
    retry: false,
  })

  if (authLoading || templateLoading || (!!user && submissionLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (templateError || !template) {
    return (
      <StatusScreen
        title="Invalid Link"
        message="This submission link is invalid. Contact the sender for a working link."
      />
    )
  }

  if (!user) {
    const requesterName = template.requester_company_legal_name?.trim() || 'A company'
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Submit Information</h1>
            <p className="text-muted-foreground mt-1">
              {requesterName} is requesting a <strong>{template.name}</strong> submission.
              Sign in or create an account to continue.
            </p>
          </div>
          <Suspense fallback={<div className="text-center text-sm text-muted-foreground">Loading sign in…</div>}>
            <AuthForm
              embedded
              defaultTab="signup"
              redirectPath={`/submit/${token}`}
              welcomeTitle="Welcome to Ramply"
            />
          </Suspense>
        </div>
      </div>
    )
  }

  if (submissionError || !shareRequest) {
    return (
      <StatusScreen
        title="Submissions Unavailable"
        message={
          submissionError instanceof Error
            ? submissionError.message
            : 'This form is not accepting submissions right now.'
        }
      />
    )
  }

  if (shareRequest.status === 'completed' || completed) {
    return <ShareRequestCompleteScreen />
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600" />
      </div>
    )
  }

  const requesterName = shareRequest.requester_company_legal_name ?? template.requester_company_legal_name ?? 'A company'
  const totalFields =
    (shareRequest.mandatory_fields?.length ?? 0) + (shareRequest.optional_fields?.length ?? 0)
  const totalDocs =
    (shareRequest.mandatory_documents?.length ?? 0) + (shareRequest.optional_documents?.length ?? 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Submit Information</h1>
          <p className="text-muted-foreground mt-1">
            <strong>{requesterName}</strong> is requesting a <strong>{shareRequest.request_type}</strong> submission with{' '}
            {totalFields} field{totalFields !== 1 ? 's' : ''}{' '}
            and {totalDocs} document{totalDocs !== 1 ? 's' : ''}.
          </p>
        </div>

        <FulfillmentForm
          shareRequest={shareRequest}
          onComplete={() => {
            setCompleted(true)
            void refetchSubmission()
          }}
        />
      </div>
    </div>
  )
}

function StatusScreen({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-red-600 p-3 rounded-full">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
