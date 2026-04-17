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
import type { CompanyDocumentRow, CompanyRow } from '@/lib/database.types'

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
  const [assets, setAssets] = useState<AssetItem[]>([])

  const companyName = useMemo(() => {
    return companyRow?.legal_name || companyRow?.dba_name || 'Unknown company'
  }, [companyRow])

  const loadAssets = useCallback(async () => {
    if (!company) return
    setLoading(true)
    setError(null)

    const { data: targetCompany, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .maybeSingle()

    if (companyError) {
      setError('Failed to load company details')
      setLoading(false)
      return
    }

    setCompanyRow(targetCompany ?? null)

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

    const { data: sharedDocs, error: docsError } = await supabase
      .from('shared_documents')
      .select('share_request_id, company_documents(*)')
      .in('share_request_id', requestIds)

    if (docsError) {
      setError('Failed to load shared documents')
      setLoading(false)
      return
    }

    const items = (sharedDocs ?? [])
      .map((row) => ({
        shareRequestId: row.share_request_id as string,
        document: row.company_documents as unknown as CompanyDocumentRow,
      }))
      .filter((row) => Boolean(row.document?.id))

    setAssets(items)
    setLoading(false)
  }, [company, companyId, supabase])

  useEffect(() => {
    if (!company) return
    loadAssets()
  }, [company, loadAssets])

  const handleOpen = useCallback(async (doc: CompanyDocumentRow) => {
    if (!doc.file_path) return

    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(doc.file_path, 60)

    if (error || !data?.signedUrl) {
      setError('Failed to generate file link')
      return
    }

    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }, [supabase])

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
