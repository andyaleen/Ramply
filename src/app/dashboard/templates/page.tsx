import { redirect } from 'next/navigation'

/** Templates live on the Send Requests page. */
export default function LegacyTemplatesPage() {
  redirect('/dashboard/send-links')
}
