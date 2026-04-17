import { redirect } from 'next/navigation'

// Legacy /admin has been consolidated into /dashboard.
// next.config.ts handles this at the edge; this server-side redirect is a fallback.
export default function LegacyAdminPage() {
  redirect('/dashboard')
}
