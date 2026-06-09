'use client'

import { useEffect, useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CATALOG_DOCUMENT_TYPES, documentTypeLabel, type DocumentTypeKey } from '@/lib/catalog'
import { getVaultDocument } from '@/lib/vault-documents'
import type { CompanyDocumentRow } from '@/lib/database.types'

interface AddVaultFileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vaultDocs: CompanyDocumentRow[]
  uploading: string | null
  disabled?: boolean
  onUpload: (file: File, docType: DocumentTypeKey) => Promise<void>
}

/**
 * Lets users pick a document type and file before adding to the vault.
 */
export function AddVaultFileDialog({
  open,
  onOpenChange,
  vaultDocs,
  uploading,
  disabled = false,
  onUpload,
}: AddVaultFileDialogProps) {
  const [selectedType, setSelectedType] = useState<DocumentTypeKey | ''>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setSelectedType('')
      setSelectedFile(null)
      setSubmitting(false)
    }
  }, [open])

  const existingForType = selectedType ? getVaultDocument(vaultDocs, selectedType) : null
  const isBusy = submitting || uploading !== null

  const handleSubmit = async () => {
    if (!selectedType || !selectedFile || isBusy) return

    setSubmitting(true)
    try {
      await onUpload(selectedFile, selectedType)
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add a file</DialogTitle>
          <DialogDescription>
            Choose the document type and select a file to add to your vault.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vault-doc-type">Document type</Label>
            <Select
              value={selectedType}
              onValueChange={(value) => setSelectedType(value as DocumentTypeKey)}
            >
              <SelectTrigger id="vault-doc-type">
                <SelectValue placeholder="Select a document type" />
              </SelectTrigger>
              <SelectContent>
                {CATALOG_DOCUMENT_TYPES.map(({ key, label }) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vault-doc-file">File</Label>
            <input
              id="vault-doc-file"
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-2 file:text-sm file:font-medium"
              onChange={(event) => {
                setSelectedFile(event.target.files?.[0] ?? null)
              }}
            />
            {selectedFile ? (
              <p className="text-xs text-muted-foreground truncate">{selectedFile.name}</p>
            ) : null}
          </div>

          {existingForType ? (
            <p className="text-xs text-amber-700 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
              You already have a {documentTypeLabel(selectedType as DocumentTypeKey)} on file (
              {existingForType.file_name}). Uploading will replace it with a new version.
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isBusy}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={disabled || isBusy || !selectedType || !selectedFile}
          >
            {isBusy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add file
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
