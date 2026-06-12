/** Best-effort client IP for rate limiting behind proxies (Vercel, etc.). */
export function getRequestClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const firstHop = forwarded.split(',')[0]?.trim()
    if (firstHop) return firstHop
  }

  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp

  return 'unknown'
}
