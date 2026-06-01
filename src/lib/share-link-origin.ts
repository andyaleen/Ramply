/** Origin for share links — prefer the active request so local dev does not emit production URLs. */
export function getShareLinkOrigin(req: Request): string {
  const origin = req.headers.get('origin')
  if (origin) {
    return origin.replace(/\/$/, '')
  }

  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  if (host) {
    const proto =
      req.headers.get('x-forwarded-proto')
      ?? (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https')
    return `${proto}://${host}`.replace(/\/$/, '')
  }

  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
}
