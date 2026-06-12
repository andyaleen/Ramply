import { createReferralToken } from '@/lib/referrals/referral-token'

/** Builds the post-signup destination that preserves referral context. */
export function buildReferralCompleteProfilePath(token: string): string {
  return `/complete-profile?ref=${encodeURIComponent(token)}`
}

/** Builds a signup URL that lands referred users on profile setup. */
export function buildReferralSignupUrl(origin: string, companyId: string): string {
  const token = createReferralToken(companyId)
  const completeProfilePath = buildReferralCompleteProfilePath(token)
  const params = new URLSearchParams({
    tab: 'signup',
    ref: token,
    redirect: completeProfilePath,
  })

  return `${origin.replace(/\/$/, '')}/signup?${params.toString()}`
}
