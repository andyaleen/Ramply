import { redirect } from 'next/navigation'

export default function LegacyAdminTemplates() {
  redirect('/dashboard/send-links')
}
