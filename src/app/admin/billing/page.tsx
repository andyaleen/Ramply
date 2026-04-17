import { redirect } from 'next/navigation'

interface LegacyBillingParams {
  searchParams: Promise<{ success?: string; canceled?: string }>
}

export default async function LegacyAdminBilling({ searchParams }: LegacyBillingParams) {
  const params = await searchParams
  const query = new URLSearchParams()
  if (params.success) query.set('success', params.success)
  if (params.canceled) query.set('canceled', params.canceled)
  const suffix = query.toString() ? `?${query.toString()}` : ''
  redirect(`/dashboard/billing${suffix}`)
}
