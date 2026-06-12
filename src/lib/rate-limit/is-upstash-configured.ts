import { readEnv } from '@/lib/env'

/** True when Upstash Redis REST credentials are configured. */
export function isUpstashRateLimitConfigured(): boolean {
  return Boolean(readEnv('UPSTASH_REDIS_REST_URL') && readEnv('UPSTASH_REDIS_REST_TOKEN'))
}
