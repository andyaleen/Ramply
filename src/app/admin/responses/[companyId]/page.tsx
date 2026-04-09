import { CompanyAssets } from '@/components/dashboard/CompanyAssets'

interface CompanyAssetsPageProps {
  params: { companyId: string }
}

export default function CompanyAssetsPage({ params }: CompanyAssetsPageProps) {
  return <CompanyAssets companyId={params.companyId} />
}
