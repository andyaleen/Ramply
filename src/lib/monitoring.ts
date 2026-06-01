/**
 * Server-side error reporting hook. Wire to Sentry/Datadog by setting
 * MONITORING_DSN or replacing reportServerError implementation.
 */
export function reportServerError(
  context: string,
  error: unknown,
  metadata?: Record<string, unknown>
): void {
  const payload = {
    context,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...metadata,
  }

  console.error('[monitoring]', payload)

  if (process.env.MONITORING_DSN) {
    // Extension point: send payload to external monitoring when DSN is configured.
  }
}
