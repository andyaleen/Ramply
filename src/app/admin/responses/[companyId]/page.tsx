import { redirect } from 'next/navigation'

interface LegacyParams {
  params: Promise<{ companyId: string }>
}

export default async function LegacyAdminCompanyAssets({ params }: LegacyParams) {
  const { companyId } = await params
  redirect(`/dashboard/responses/${companyId}`)
}
