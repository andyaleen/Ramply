/** Columns a signed-in user may change on their own users row. */
export const USER_SELF_UPDATABLE_FIELDS = ['notification_preferences', 'updated_at'] as const

type UserSelfUpdatableField = (typeof USER_SELF_UPDATABLE_FIELDS)[number]

/**
 * Strips protected user columns from a self-update payload.
 * Role changes must go through set_user_role(); the DB trigger is the backstop.
 */
export function pickUserSelfUpdateFields(
  data: Record<string, unknown>
): Partial<Record<UserSelfUpdatableField, unknown>> {
  const allowed = new Set<string>(USER_SELF_UPDATABLE_FIELDS)
  const sanitized: Partial<Record<UserSelfUpdatableField, unknown>> = {}

  for (const [key, value] of Object.entries(data)) {
    if (allowed.has(key)) {
      sanitized[key as UserSelfUpdatableField] = value
    }
  }

  return sanitized
}
