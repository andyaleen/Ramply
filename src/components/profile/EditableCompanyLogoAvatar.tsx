'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useCompanyLogoUpload } from '@/hooks/useCompanyLogoUpload'
import { useCompanyLogoUrl } from '@/hooks/useCompanyLogoUrl'
import { cn } from '@/lib/utils'
import { Loader2, Pencil } from 'lucide-react'
import { toast } from 'sonner'

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

interface EditableCompanyLogoAvatarProps {
  editable?: boolean
  className?: string
}

/** Company logo avatar for the profile header; shows a pencil control while editing. */
export function EditableCompanyLogoAvatar({
  editable = false,
  className,
}: EditableCompanyLogoAvatarProps) {
  const { user, company, updateCompany } = useAuth()
  const { logoUrl } = useCompanyLogoUrl(company?.logo_path)
  const { inputRef, uploading, pick, handleFileChange } = useCompanyLogoUpload({
    user,
    company,
    updateCompany,
    onSuccess: () => toast.success('Company logo updated'),
    onError: (message) => toast.error(message),
  })

  const initials = company?.legal_name
    ? getInitials(company.legal_name)
    : company?.contact_name
      ? getInitials(company.contact_name)
      : 'CO'

  return (
    <div className={cn('relative shrink-0', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleFileChange}
      />

      <Avatar className="h-20 w-20">
        {logoUrl ? (
          <AvatarImage src={logoUrl} alt="Company logo" className="object-contain p-2" />
        ) : null}
        <AvatarFallback className="text-lg">{initials}</AvatarFallback>
      </Avatar>

      {uploading ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
          <Loader2 className="h-5 w-5 animate-spin text-white" />
        </div>
      ) : null}

      {editable ? (
        <button
          type="button"
          onClick={pick}
          disabled={uploading}
          aria-label="Change company logo"
          className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background shadow-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      ) : null}
    </div>
  )
}
