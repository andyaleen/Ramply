import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildReferralSignupUrl } from '@/lib/referrals/referral-link'
import { getShareLinkOrigin } from '@/lib/share-link-origin'

/** Returns the authenticated user's referral signup link. */
export async function GET(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, legal_name, contact_name')
    .eq('owner_user_id', user.id)
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
