import { NextResponse } from 'next/server'
import { requireAppSession } from '@/lib/auth/require-app-session'
import { createClient } from '@/lib/supabase/server'
import { buildReferralSignupUrl } from '@/lib/referrals/referral-link'
import { getShareLinkOrigin } from '@/lib/share-link-origin'

/** Returns the authenticated user's referral signup link. */
export async function GET(req: Request) {
  const supabase = await createClient()
  const session = await requireAppSession(supabase)
  if (!session.ok) return session.response

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, legal_name, contact_name')
    .eq('owner_user_id', session.user.id)
    .single()

  if (companyError || !company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 400 })
  }

  const companyName = company.legal_name?.trim() || 'Ramply'
  const referrerName = company.contact_name?.trim() || companyName
  const link = buildReferralSignupUrl(getShareLinkOrigin(req), company.id)

  return NextResponse.json({
    link,
    referrer_name: referrerName,
    company_name: companyName,
  })
}
