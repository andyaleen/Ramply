export const INVALID_SIGN_IN_CREDENTIALS_MESSAGE =
  'Incorrect email or password. If you use Google sign-in, choose Continue with Google instead.'

export const INVALID_SIGN_IN_CREDENTIALS_CODE = 'invalid_credentials'

export const INVITE_CONFIRMATION_FAILURE_MESSAGE =
  'Unable to confirm this invite. Check the invite email and try again.'

export const INVITE_CONFIRMATION_FAILURE_CODE = 'invite_confirmation_failed'

export const SIGN_IN_FAILURE_MESSAGE = 'Unable to sign in. Please try again.'

export const SIGN_IN_FAILURE_CODE = 'sign_in_failed'

export type CompletePasswordSignInErrorCode =
  | typeof INVALID_SIGN_IN_CREDENTIALS_CODE
  | typeof INVITE_CONFIRMATION_FAILURE_CODE
  | typeof SIGN_IN_FAILURE_CODE
