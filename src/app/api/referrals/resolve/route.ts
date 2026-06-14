import { NextResponse } from 'next/server'
import { resolveReferralInvite } from '@/lib/referrals/resolve-referral'
import { enforcePublicRateLimit } from '@/lib/rate-limit/public-rate-limits'

/** Resolves public referrer details for a referral token. */
export async function GET(req: Request) {
  const rateLimit = await enforcePublicRateLimit(req, 'referrals-resolve')
  if (!rateLimit.ok) {
    return rateLimit.response
  }

  const ref = new URL(req.url).searchParams.get('ref')?.trim()
  if (!ref) {
    return NextResponse.json({ error: 'Referral token is required' }, { status: 400 })
  }

  try {
    const invite = await resolveReferralInvite(ref)
    if (!invite) {
      return NextResponse.json({ error: 'Invalid referral link' }, { status: 404 })
    }

    return NextResponse.json({
      referrer_name: invite.referrerName,
      company_name: invite.companyName,
      invite_headline: `${invite.referrerName} from ${invite.companyName} invites you to use Ramply.`,
    })
  } catch {
    return NextResponse.json({ error: 'Unable to resolve referral link' }, { status: 503 })
  }
}
