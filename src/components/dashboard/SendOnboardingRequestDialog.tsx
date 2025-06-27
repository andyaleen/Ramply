'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { OnboardingRequestSchema, type OnboardingRequest } from '@/lib/validations'
import { generateToken } from '@/lib/utils'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'

interface SendOnboardingRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onboardingTypeId: string | null
  onSuccess: () => void
}

export function SendOnboardingRequestDialog({
  open,
  onOpenChange,
  onboardingTypeId,
  onSuccess,
}: SendOnboardingRequestDialogProps) {
  const { user, isAdmin } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  console.log("is admin:", isAdmin, "user:", user)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OnboardingRequest>({
    resolver: zodResolver(OnboardingRequestSchema),
  })

  const createMutation = useMutation({
    mutationFn: async (data: OnboardingRequest & {
      requester_user_id: string
      token: string
      expires_at: string
    }) => {
      const { data: result, error } = await supabase
        .from('onboarding_requests')
        .insert([data])
        .select()
        .single()
        
      if (error) throw error
      return result
    },    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-requests'] })
      const link = `${window.location.origin}/onboard/${data.token}`
      setGeneratedLink(link)
      toast.success('Onboarding link generated successfully!')
    },
    onError: (error) => {
      console.error('Failed to create onboarding request:', error)
      toast.error('Failed to create onboarding request. Please try again.')
    }
  })
  const onSubmit = (data: OnboardingRequest) => {
    if (!user || !onboardingTypeId) {
      console.warn('Missing user or onboarding type ID')
      return
    }

    const token = generateToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    createMutation.mutate({
      ...data,
      onboarding_type_id: onboardingTypeId,
      requester_user_id: user.id,
      token,
      expires_at: expiresAt.toISOString(),
    })
  }

  const copyLink = async () => {
    if (!generatedLink) return

    try {
      await navigator.clipboard.writeText(generatedLink)
      console.log('✅ Link copied to clipboard')
      toast.success('Link copied to clipboard!')
    } catch (error) {
      console.error('❌ Failed to copy link:', error)
      toast.error('Failed to copy link. Please try again.')
    }
  }

  const handleClose = () => {
    reset()
    setGeneratedLink(null)
    onOpenChange(false)
    if (generatedLink) onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {generatedLink ? 'Onboarding Link Generated' : 'Send Onboarding Request'}
          </DialogTitle>
          <DialogDescription>
            {generatedLink
              ? 'Share this link with your vendor or customer to complete the onboarding process.'
              : 'Enter the email address of the vendor or customer you want to onboard.'}
          </DialogDescription>
        </DialogHeader>

        {generatedLink ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Onboarding Link</Label>
              <div className="flex gap-2">
                <Input value={generatedLink} readOnly className="font-mono text-sm" />
                <Button onClick={copyLink} variant="outline" size="sm">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                This link will expire in 30 days. The recipient will need to create an account
                or log in to complete the onboarding process.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipient_email">Recipient Email *</Label>
              <Input
                id="recipient_email"
                type="email"
                {...register('recipient_email')}
                placeholder="vendor@company.com"
              />
              {errors.recipient_email && (
                <p className="text-sm text-red-600">{errors.recipient_email.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Generating...' : 'Generate Link'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
