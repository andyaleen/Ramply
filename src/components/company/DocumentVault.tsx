'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { CATALOG_DOCUMENT_TYPES, documentTypeLabel, type DocumentTypeKey } from '@/lib/catalog'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, CheckCircle, FileText, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { AddVaultFileDialog } from '@/components/company/AddVaultFileDialog'
import { useDocumentUpload } from '@/hooks/useDocumentUpload'
import { useVaultDocuments } from '@/hooks/useVaultDocuments'
import { getUploadErrorMessage } from '@/lib/document-upload'
import { getVaultDocument } from '@/lib/vault-documents'

export function DocumentVault() {
  const { user, company } = useAuth()
  const router = useRouter()
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const { data: docs = [], isFetching, isFetched, refetch } = useVaultDocuments(company?.id)
  const vaultChecking = !!company?.id && !isFetched && isFetching

  const handleUploadSuccess = ({ doc, duplicate }: { doc: { id: string; version: number }; duplicate: boolean }, docType: string) => {
    if (duplicate) {
      toast.info('This file is identical to the current version — no update needed.')
      return
    }
    const label = documentTypeLabel(docType)
    toast.success(
      docs.some((existing) => existing.document_type === docType)
        ? `${label} updated to v${doc.version}`
        : `${label} uploaded`
    )
    void refetch()
    router.push(`/dashboard/documents/review/${doc.id}`)
  }

  const { inputRef, uploading, pick, handleFileChange, uploadFile } = useDocumentUpload({
    user,
    company,
    existingDocs: docs,
    onSuccess: handleUploadSuccess,
    onError: (err) => {
      toast.error(getUploadErrorMessage(err))
    },
  })

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Document Vault</h2>
        <p className="text-sm text-muted-foreground">
          Store your company documents by type. Files are reused automatically for share requests,
          and previous versions are kept for audit purposes.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
        onChange={handleFileChange}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CATALOG_DOCUMENT_TYPES.map(({ key, label }) => {
          const existing = getVaultDocument(docs, key)
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
                    {existing ? (
                      <p className="text-xs text-muted-foreground truncate">
                        {existing.file_name}
                        {existing.version > 1 && (
                          <span className="ml-1 text-blue-500">v{existing.version}</span>
                        )}
                      </p>
                    ) : vaultChecking ? (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Checking vault…
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-3 shrink-0">
                  {existing && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => router.push(`/dashboard/documents/review/${existing.id}`)}
                      disabled={isUploading}
                    >
                      Review
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant={existing ? 'outline' : 'default'}
                    onClick={() => pick(key)}
                    disabled={isUploading || !company}
                  >
                    {isUploading
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <><Upload className="h-4 w-4 mr-1" />{existing ? 'Replace' : 'Upload'}</>
                    }
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="flex justify-center pt-2">
        <Button
          variant="outline"
          onClick={() => setAddDialogOpen(true)}
          disabled={!company || uploading !== null}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add a File
        </Button>
      </div>

      <AddVaultFileDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        vaultDocs={docs}
        uploading={uploading}
        disabled={!company}
        onUpload={uploadFile}
      />
    </div>
  )
}
