'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, ExternalLink } from 'lucide-react'
import { documentTypeLabel } from '@/lib/catalog'
import type { CompanyDocumentRow, CompanyRow, SharedDataRow } from '@/lib/database.types'
import {
  downloadFromSignedUrl,
  fetchSharedDocumentDownloadUrl,
} from '@/lib/shared-document-download'
import {
  fetchSharedDocumentsForRequester,
  fetchSharedRecipientCompanies,
  resolveRecipientCompanyLabel,
} from '@/lib/requester-share-responses'

interface CompanyAssetsProps {
  companyId: string
}

interface AssetItem {
  shareRequestId: string
  document: CompanyDocumentRow
}

export function CompanyAssets({ companyId }: CompanyAssetsProps) {
  const { company } = useAuth()
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [companyRow, setCompanyRow] = useState<CompanyRow | null>(null)
  const [sharedSnapshot, setSharedSnapshot] = useState<Pick<SharedDataRow, 'field_data'> | null>(null)
  const [assets, setAssets] = useState<AssetItem[]>([])

  const companyName = useMemo(() => {
    return resolveRecipientCompanyLabel(companyRow, sharedSnapshot)
  }, [companyRow, sharedSnapshot])

  const loadAssets = useCallback(async () => {
    if (!company) return
    setLoading(true)
    setError(null)

    let targetCompany: CompanyRow | null = null
    try {
      const companies = await fetchSharedRecipientCompanies(supabase, [companyId])
      targetCompany = companies[0] ?? null
    } catch {
      setError('Failed to load company details')
      setLoading(false)
      return
    }

    setCompanyRow(targetCompany)

    const { data: requests, error: requestError } = await supabase
      .from('share_requests')
      .select('id')
      .eq('requester_company_id', company.id)
      .eq('completed_by_company_id', companyId)
      .eq('status', 'completed')

    if (requestError) {
      setError('Failed to load share requests')
      setLoading(false)
      return
    }

    const requestIds = (requests ?? []).map((req) => req.id)
    if (!requestIds.length) {
      setAssets([])
      setLoading(false)
      return
    }

    const { data: sharedDataRows, error: sharedDataError } = await supabase
      .from('shared_data')
      .select('field_data')
      .in('share_request_id', requestIds)
      .order('shared_at', { ascending: false })
      .limit(1)

    if (sharedDataError) {
      setError('Failed to load shared company details')
      setLoading(false)
      return
    }

    setSharedSnapshot(
      sharedDataRows?.[0]?.field_data
        ? { field_data: sharedDataRows[0].field_data as SharedDataRow['field_data'] }
        : null
    )

    let sharedDocLinks
    try {
      sharedDocLinks = await fetchSharedDocumentsForRequester(supabase, requestIds)
    } catch {
      setError('Failed to load shared documents')
      setLoading(false)
      return
    }

    const items = sharedDocLinks.map((row) => ({
      shareRequestId: row.share_request_id,
      document: row.document,
    }))

    setAssets(items)
    setLoading(false)
  }, [company, companyId, supabase])

  useEffect(() => {
    if (!company) return
    loadAssets()
  }, [company, loadAssets])

  const handleOpen = useCallback(async (doc: CompanyDocumentRow) => {
    if (!doc.id) return

    try {
      const { signedUrl } = await fetchSharedDocumentDownloadUrl(doc.id)
      downloadFromSignedUrl(signedUrl, doc.file_name)
    } catch {
      setError('Failed to generate file link')
    }
  }, [])

  const uniqueAssets = useMemo(() => {
    const seen = new Set<string>()
    return assets.filter((item) => {
      if (seen.has(item.document.id)) return false
      seen.add(item.document.id)
      return true
    })
  }, [assets])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{companyName} Assets</h2>
          <p className="text-sm text-muted-foreground">
            Documents shared in completed requests from this company.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/dashboard/responses')}>
          Back to Responses
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-700">{error}</CardContent>
        </Card>
      )}

      {loading ? (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">Loading assets...</CardContent>
        </Card>
      ) : uniqueAssets.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Uploaded Assets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {uniqueAssets.map((item) => (
              <div key={item.document.id} className="flex items-center justify-between gap-4 border rounded-lg p-3">
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm font-medium">{documentTypeLabel(item.document.document_type)}</p>
                    <p className="text-xs text-gray-500">{item.document.file_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Shared</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpen(item.document)}
                    className="flex items-center gap-1"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            No shared documents found for this company yet.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
