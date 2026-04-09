'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { CATALOG_DOCUMENT_TYPES, documentTypeLabel, type DocumentTypeKey } from '@/lib/catalog'
import type { CompanyDocumentRow } from '@/lib/database.types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, CheckCircle, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

/** SHA-256 hash of a File, returned as a hex string. Used for deduplication. */
async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export function DocumentVault() {
  const { user, company } = useAuth()
  const supabase = createClient()
  const router = useRouter()
  // Only the active (latest) document per type — superseded rows are excluded
  const [docs, setDocs] = useState<CompanyDocumentRow[]>([])
  const [uploading, setUploading] = useState<DocumentTypeKey | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingType = useRef<DocumentTypeKey | null>(null)

  useEffect(() => {
    if (!company) return
    /** Fetch only active docs: those not pointed to by any superseded_by reference. */
    supabase
      .from('company_documents')
      .select('*')
      .eq('company_id', company.id)
      .is('superseded_by', null)
      .then(({ data }) => setDocs(data ?? []))
  }, [company, supabase])

  const handleUploadClick = (docType: DocumentTypeKey) => {
    pendingType.current = docType
    inputRef.current?.click()
  }

  /** Uploads a document, triggers OCR, then routes to the review page. */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const docType = pendingType.current
    if (!file || !docType || !user || !company) return

    // Reset so the same file can be re-selected later
    e.target.value = ''

    setUploading(docType)
    try {
      const hash = await hashFile(file)

      // Check for an identical document already in the vault (deduplication)
      const existing = docs.find(d => d.document_type === docType)
      if (existing?.file_hash === hash) {
        toast.info('This file is identical to the current version — no update needed.')
        return
      }

      // Unique path per upload so history is preserved in storage
      const timestamp = Date.now()
      const filePath = `${user.id}/${docType}/${timestamp}_${file.name}`

      const { error: storageError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, { upsert: false })

      if (storageError) throw storageError

      const nextVersion = (existing?.version ?? 0) + 1

      // Insert new version row
      const { data: newRow, error: insertError } = await supabase
        .from('company_documents')
        .insert({
          company_id: company.id,
          document_type: docType,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          file_hash: hash,
          version: nextVersion,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Mark the previous version as superseded
      if (existing) {
        await supabase
          .from('company_documents')
          .update({ superseded_by: newRow.id })
          .eq('id', existing.id)
      }

      setDocs(prev => {
        const filtered = prev.filter(d => d.document_type !== docType)
        return [...filtered, newRow]
      })

      toast.success(
        existing
          ? `${documentTypeLabel(docType)} updated to v${nextVersion}`
          : `${documentTypeLabel(docType)} uploaded`
      )

      let ingestError: string | null = null
      try {
        const response = await fetch('/api/documents/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company_document_id: newRow.id }),
        })
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}))
          ingestError = errorBody?.error ?? 'OCR request failed'
        }
      } catch (error) {
        ingestError = error instanceof Error ? error.message : 'OCR request failed'
      }

      if (ingestError) {
        toast.error('OCR failed to start. You can retry on the review page.')
      }

      router.push(`/dashboard/documents/review/${newRow.id}`)
    } catch (err) {
      console.error('Upload error:', err)
      toast.error('Upload failed. Please try again.')
    } finally {
      setUploading(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Document Vault</h2>
        <p className="text-sm text-muted-foreground">
          Upload each document once — it will be reused automatically for share requests.
          Previous versions are kept for audit purposes.
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
        onChange={handleFileChange}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CATALOG_DOCUMENT_TYPES.map(({ key, label }) => {
          const existing = docs.find(d => d.document_type === key)
          const isUploading = uploading === key

          return (
            <Card key={key} className={existing ? 'border-green-200 bg-green-50' : ''}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 min-w-0">
                  {existing
                    ? <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                    : <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  }
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{label}</p>
                    {existing && (
                      <p className="text-xs text-muted-foreground truncate">
                        {existing.file_name}
                        {existing.version > 1 && (
                          <span className="ml-1 text-blue-500">v{existing.version}</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  size="sm"
                  variant={existing ? 'outline' : 'default'}
                  onClick={() => handleUploadClick(key)}
                  disabled={isUploading}
                  className="ml-3 shrink-0"
                >
                  {isUploading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <><Upload className="h-4 w-4 mr-1" />{existing ? 'Replace' : 'Upload'}</>
                  }
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
