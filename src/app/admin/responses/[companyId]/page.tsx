import { CompanyAssets } from '@/components/dashboard/CompanyAssets'

interface CompanyAssetsPageProps {
  params: Promise<{ companyId: string }>
}

export default async function CompanyAssetsPage({ params }: CompanyAssetsPageProps) {
  const { companyId } = await params
  return <CompanyAssets companyId={companyId} />
}
