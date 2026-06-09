import { redirect } from 'next/navigation'

/** Legacy route — completed submissions live on Responses. */
export default function ReceivedRedirectPage() {
  redirect('/dashboard/responses')
}
