'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useCompanyLogoUpload } from '@/hooks/useCompanyLogoUpload'
import { useCompanyLogoUrl } from '@/hooks/useCompanyLogoUrl'
import { maxLogoUploadSizeLabel } from '@/lib/company-logo-upload'
import { ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

interface CompanyLogoUploadProps {
  /** Larger avatar for profile header; compact for setup form. */
  variant?: 'default' | 'compact'
  showRemove?: boolean
}

/** Upload, preview, and remove the company's brand logo. */
export function CompanyLogoUpload({ variant = 'default', showRemove = true }: CompanyLogoUploadProps) {
  const { user, company, updateCompany } = useAuth()
  const { logoUrl } = useCompanyLogoUrl(company?.logo_path)
  const { inputRef, uploading, pick, handleFileChange, removeLogo } = useCompanyLogoUpload({
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

  const avatarSize = variant === 'compact' ? 'h-16 w-16' : 'h-20 w-20'

  return (
    <div className="flex items-center gap-4">
      <Avatar className={avatarSize}>
        {logoUrl ? <AvatarImage src={logoUrl} alt="Company logo" className="object-contain p-1" /> : null}
        <AvatarFallback className="text-lg">{initials}</AvatarFallback>
      </Avatar>

      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium">Company Logo</p>
          <p className="text-xs text-muted-foreground">
            Optional. Appears on exported PDFs and your profile. PNG, JPEG, WebP, or SVG up to {maxLogoUploadSizeLabel()}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button type="button" variant="outline" size="sm" onClick={pick} disabled={uploading}>
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="mr-2 h-4 w-4" />
            )}
            {company?.logo_path ? 'Replace Logo' : 'Upload Logo'}
          </Button>
          {showRemove && company?.logo_path ? (
            <Button type="button" variant="ghost" size="sm" onClick={removeLogo} disabled={uploading}>
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
