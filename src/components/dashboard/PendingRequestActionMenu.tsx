'use client'

import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { isPendingRequestExpired } from '@/lib/pending-request-status'
import type { PendingSentRequest } from '@/lib/requester-pending-requests'

interface PendingRequestActionMenuProps {
  request: PendingSentRequest
  disabled?: boolean
  onRemind: (request: PendingSentRequest) => void
  onCancel: (request: PendingSentRequest) => void
  className?: string
}

/** Action dropdown for a pending sent share request (Remind or Cancel). */
export function PendingRequestActionMenu({
  request,
  disabled = false,
  onRemind,
  onCancel,
  className,
}: PendingRequestActionMenuProps) {
  const expired = isPendingRequestExpired(request.expires_at)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className={className}
        >
          Action
          <ChevronDown className="ml-1 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          disabled={expired}
          onSelect={() => onRemind(request)}
        >
          Remind
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={() => onCancel(request)}>
          Cancel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
