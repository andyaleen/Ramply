'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import type { CompanyDocumentRow, CompanyRow, DocumentExtractionRow } from '@/lib/database.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const FIELD_LABELS: Record<keyof Pick<CompanyRow,
  | 'legal_name'
  | 'dba_name'
  | 'ein'
  | 'address_line1'
  | 'city'
  | 'state'
  | 'postal_code'
>, string> = {
  legal_name: 'Legal name',
  dba_name: 'DBA name',
  ein: 'EIN',
  address_line1: 'Address line 1',
  city: 'City',
  state: 'State',
  postal_code: 'Postal code',
}

const FIELD_KEYS = Object.keys(FIELD_LABELS) as Array<keyof typeof FIELD_LABELS>

type ExtractionPayload = DocumentExtractionRow & {
  metadata: Record<string, unknown> | null
}

interface DocumentReviewProps {
  documentId: string
}

/** Build an empty fields map for the review form. */
function emptyFields(): Record<string, string> {
  return FIELD_KEYS.reduce((acc, key) => {
    acc[key] = ''
    return acc
  }, {} as Record<string, string>)
}

function applyFields(target: Record<string, string>, source: unknown) {
  if (!source || typeof source !== 'object') return
  for (const key of FIELD_KEYS) {
    const value = (source as Record<string, unknown>)[key]
    if (typeof value === 'string') {
      target[key] = value
    }
  }
}

export function DocumentReview({ documentId }: DocumentReviewProps) {
  const { company } = useAuth()
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [docLabel, setDocLabel] = useState('')
  const [docType, setDocType] = useState('')
  const [documentRow, setDocumentRow] = useState<CompanyDocumentRow | null>(null)
  const [extraction, setExtraction] = useState<ExtractionPayload | null>(null)
  const [fields, setFields] = useState<Record<string, string>>(emptyFields)
  const [error, setError] = useState<string | null>(null)

  /** Loads the latest extraction for the given document. */
  const loadExtraction = useCallback(async () => {
    if (!company) return
    setLoading(true)
    setError(null)

    const { data: docData, error: docError } = await supabase
      .from('company_documents')
      .select('id, document_type, file_name, extracted_fields, approved_fields')
      .eq('id', documentId)
      .eq('company_id', company.id)
      .single()

    if (docError || !docData) {
      setError('Document not found')
      setLoading(false)
      return
    }

    setDocumentRow(docData as CompanyDocumentRow)
    setDocLabel(`${docData.file_name} (${docData.document_type})`)
    setDocType(docData.document_type)

    const { data, error: extractionError } = await supabase
      .from('document_extractions')
      .select('id, company_id, company_document_id, provider, status, raw_text, structured_data, metadata, error_message, created_at, updated_at')
      .eq('company_document_id', documentId)
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (extractionError) {
      setError('Failed to load OCR results')
      setLoading(false)
      return
    }

    setExtraction((data ?? null) as ExtractionPayload | null)

    const nextFields = emptyFields()
    if (docData.approved_fields) {
      applyFields(nextFields, docData.approved_fields)
    } else if (docData.extracted_fields) {
      applyFields(nextFields, docData.extracted_fields)
    } else if (data?.metadata && typeof data.metadata === 'object') {
      const metadata = data.metadata as Record<string, unknown>
      applyFields(nextFields, metadata.extracted_fields)
    }

    setFields(nextFields)
    setLoading(false)
  }, [company, documentId, supabase])

  useEffect(() => {
    if (!company) return
    loadExtraction()
  }, [company, loadExtraction])

  /** Runs OCR again for the current document. */
  const handleRetry = useCallback(async () => {
    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/documents/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_document_id: documentId }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body?.error ?? 'OCR request failed')
      }

      toast.success('OCR re-run started')
      await loadExtraction()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'OCR request failed'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }, [documentId, loadExtraction])

  /** Persists approved fields to the document asset. */
  const handleApprove = useCallback(async () => {
    if (!company || !documentRow) return

    setSaving(true)
    setError(null)

    const payload = FIELD_KEYS.reduce((acc, key) => {
      acc[key] = fields[key] ?? ''
      return acc
    }, {} as Record<string, string>)

    try {
      const { error: updateError } = await supabase
        .from('company_documents')
        .update({
          approved_fields: payload,
          approved_at: new Date().toISOString(),
        })
        .eq('id', documentRow.id)

      if (updateError) throw updateError

      if (extraction) {
        const nextMetadata = {
          ...(extraction.metadata ?? {}),
          extracted_fields: fields,
          approved_fields: payload,
          approved_at: new Date().toISOString(),
        }

        await supabase
          .from('document_extractions')
          .update({ metadata: nextMetadata, updated_at: new Date().toISOString() })
          .eq('id', extraction.id)
      }

      toast.success('Fields approved and saved')
      router.push('/dashboard/documents')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save fields'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }, [company, documentRow, extraction, fields, router, supabase])

  const hasExtraction = Boolean(extraction)
  const isW9 = docType === 'W9'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Review extracted fields</h2>
        <p className="text-sm text-muted-foreground">
          Review and edit the fields detected from your document, then approve to save them.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Document</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {docLabel || 'Loading document details...'}
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-700">
            {error}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            Loading OCR results...
          </CardContent>
        </Card>
      ) : hasExtraction ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Extracted fields</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {FIELD_KEYS.map((key) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key}>{FIELD_LABELS[key]}</Label>
                <Input
                  id={key}
                  value={fields[key] ?? ''}
                  onChange={(event) =>
                    setFields((prev) => ({ ...prev, [key]: event.target.value }))
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <p className="text-sm text-muted-foreground">
              No OCR results yet.
            </p>
            <Button size="sm" onClick={handleRetry} disabled={saving}>
              {saving ? 'Working...' : 'Run OCR'}
            </Button>
          </CardContent>
        </Card>
      )}

      {!isW9 && !loading && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-700">
            Field extraction is currently only available for W-9 documents.
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleApprove} disabled={saving || !hasExtraction || !isW9}>
          {saving ? 'Saving...' : 'Approve and Save'}
        </Button>
        <Button variant="outline" onClick={handleRetry} disabled={saving}>
          {saving ? 'Working...' : 'Re-run OCR'}
        </Button>
        <Button variant="ghost" onClick={() => router.push('/dashboard/documents')}>
          Back to File Upload
        </Button>
      </div>
    </div>
  )
}
