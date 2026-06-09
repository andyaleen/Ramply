import { isPkceVerifierError } from '@/lib/auth/wait-for-auth-session'

/** Maps Supabase auth exchange failures to user-facing guidance. */
export function formatAuthExchangeError(message: string): string {
  if (isPkceVerifierError(message)) {
    return 'This sign-in link must be opened in the same browser where you started sign-in. Go back to the login page, sign in again, and complete the flow without switching browsers or ports.'
  }

  if (/expired|invalid.*link|already.*used/i.test(message)) {
    return 'This sign-in link has expired or was already used. Request a new link from the login page.'
  }

  return message
}
