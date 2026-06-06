'use client'

import { Suspense, useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AuthForm } from '@/components/auth/AuthForm'
import { FulfillmentForm } from '@/components/onboarding/FulfillmentForm'
import type { ShareRequestRow, CompanyDocumentRow } from '@/lib/database.types'
import { safeLowerCase } from '@/lib/utils'
import { AlertCircle, CheckCircle, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ShareRequestWithRequester = Omit<ShareRequestRow, 'token'> & {
  requester_company_legal_name: string | null
}

/** Coerce RPC nulls and legacy rows into a safe shape for the UI. */
function normalizeShareRequest(data: unknown): ShareRequestWithRequester | null {
  const row = (Array.isArray(data) ? data[0] : data) as ShareRequestWithRequester | null | undefined
  if (!row || typeof row !== 'object' || !row.id) return null

  return {
    ...row,
    request_type: row.request_type?.trim() || 'General Request',
    mandatory_fields: row.mandatory_fields ?? [],
    optional_fields: row.optional_fields ?? [],
    mandatory_documents: row.mandatory_documents ?? [],
    optional_documents: row.optional_documents ?? [],
  }
}

export default function OnboardingPage() {
  const params = useParams()
  const token = params.token as string
  const { user, company, loading: authLoading, profileLoading, signOut } = useAuth()
  const supabase = createClient()
  const [completed, setCompleted] = useState(false)

  const { data: shareRequest, isLoading, error } = useQuery<ShareRequestWithRequester>({
    queryKey: ['share-request', token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_share_request_by_token', { p_token: token })
      if (error) throw error

      const row = Array.isArray(data) ? data[0] : data
      const normalized = normalizeShareRequest(row)
      if (!normalized) throw new Error('Share request not found')
      return normalized
    },
    enabled: !!token,
  })

  const { data: vaultDocs = [] } = useQuery<CompanyDocumentRow[]>({
    queryKey: ['vault-docs', company?.id],
    queryFn: async () => {
      if (!company) return []
      const { data } = await supabase
        .from('company_documents')
        .select('*')
        .eq('company_id', company.id)
        .is('superseded_by', null)
      return data ?? []
    },
    enabled: !!company,
  })

  if (authLoading || profileLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error || !shareRequest) {
    return (
      <StatusScreen
        color="red"
        icon={<AlertCircle className="h-6 w-6 text-white" />}
        title="Invalid Link"
        message="This link is invalid or has expired. Contact the requester for a new link."
      />
    )
  }

  if (shareRequest.status === 'expired') {
    return (
      <StatusScreen
        color="red"
        icon={<AlertCircle className="h-6 w-6 text-white" />}
        title="Link Expired"
        message="This link has expired. Please contact the requester for a new one."
      />
    )
  }

  if (shareRequest.status === 'completed' || completed) {
    return (
      <StatusScreen
        color="green"
        icon={<CheckCircle className="h-6 w-6 text-white" />}
        title="All Done!"
        message="Your information has been shared successfully."
      />
    )
  }

  if (!user) {
    const requesterName = shareRequest.requester_company_legal_name?.trim() || 'A company'
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Share Request</h1>
            <p className="text-muted-foreground mt-1">
              {requesterName} is requesting your company information. Sign in or create an account to continue.
            </p>
            {shareRequest.recipient_email && (
              <p className="mt-2 text-sm text-muted-foreground">
                Use <strong>{shareRequest.recipient_email}</strong> when signing up or signing in.
              </p>
            )}
          </div>
          <Suspense fallback={<div className="text-center text-sm text-muted-foreground">Loading sign in…</div>}>
            <AuthForm
              embedded
              defaultTab="signup"
              redirectPath={`/onboard/${token}`}
              suggestedEmail={shareRequest.recipient_email ?? undefined}
              shareRequestToken={token}
              welcomeTitle="Welcome to Ramply"
            />
          </Suspense>
        </div>
      </div>
    )
  }

  const recipientEmail = safeLowerCase(shareRequest.recipient_email)
  const userEmail = safeLowerCase(user.email)
  if (recipientEmail && userEmail && recipientEmail !== userEmail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-amber-600 p-3 rounded-full">
                <Mail className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle>Wrong account</CardTitle>
            <CardDescription>
              This link was sent to <strong>{shareRequest.recipient_email}</strong>. You are signed in as{' '}
              <strong>{user.email}</strong>. Sign out and use the correct account to fulfill this request.
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                await signOut()
                window.location.href = `/login?redirect=${encodeURIComponent(`/onboard/${token}`)}`
              }}
            >
              Sign out and switch account
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600" />
      </div>
    )
  }

  const requesterName = shareRequest.requester_company_legal_name ?? 'A company'
  const totalFields =
    (shareRequest.mandatory_fields?.length ?? 0) + (shareRequest.optional_fields?.length ?? 0)
  const totalDocs =
    (shareRequest.mandatory_documents?.length ?? 0) + (shareRequest.optional_documents?.length ?? 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Share Request</h1>
          <p className="text-muted-foreground mt-1">
            <strong>{requesterName}</strong> is requesting a <strong>{shareRequest.request_type}</strong> submission with{' '}
            {totalFields} field{totalFields !== 1 ? 's' : ''}{' '}
            and {totalDocs} document{totalDocs !== 1 ? 's' : ''}.
          </p>
        </div>

        <FulfillmentForm
          shareRequest={shareRequest}
          vaultDocs={vaultDocs}
          onComplete={() => setCompleted(true)}
        />
      </div>
    </div>
  )
}

function StatusScreen({
  color,
  icon,
  title,
  message,
}: {
  color: 'red' | 'green'
  icon: React.ReactNode
  title: string
  message: string
}) {
  const bg = color === 'green'
    ? 'from-green-50 to-green-100'
    : 'from-red-50 to-red-100'
  const iconBg = color === 'green' ? 'bg-green-600' : 'bg-red-600'

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bg} flex items-center justify-center p-4`}>
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className={`${iconBg} p-3 rounded-full`}>{icon}</div>
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
