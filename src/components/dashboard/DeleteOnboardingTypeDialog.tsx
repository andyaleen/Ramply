'use client'

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
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface DeleteOnboardingTypeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onboardingTypeId: string | null
  onboardingTypeName: string | null
  onSuccess: () => void
}

export function DeleteOnboardingTypeDialog({
  open,
  onOpenChange,
  onboardingTypeId,
  onboardingTypeName,
  onSuccess,
}: DeleteOnboardingTypeDialogProps) {
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!user || !onboardingTypeId) throw new Error('Missing user or type ID')

      // First check if there are any onboarding requests associated with this type
      const { data: requests, error: requestsError } = await supabase
        .from('onboarding_requests')
        .select('id')
        .eq('onboarding_type_id', onboardingTypeId)
        .limit(1)

      if (requestsError) throw requestsError

      if (requests && requests.length > 0) {
        throw new Error('Cannot delete onboarding type that has active requests')
      }

      // Delete the onboarding type
      const { error } = await supabase
        .from('onboarding_types')
        .delete()
        .eq('id', onboardingTypeId)
        .eq('user_id', user.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-types'] })
      toast.success('Onboarding type deleted successfully!')
      onSuccess()
    },
    onError: (error) => {
      console.error('Error deleting onboarding type:', error)
      if (error.message.includes('active requests')) {
        toast.error('Cannot delete onboarding type that has active requests. Please complete or cancel all requests first.')
      } else {
        toast.error('Failed to delete onboarding type. Please try again.')
      }
    },
  })

  const handleDelete = () => {
    deleteMutation.mutate()
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete Onboarding Type
          </DialogTitle>
          <DialogDescription className="text-left">
            Are you sure you want to delete{' '}
            <span className="font-medium">"{onboardingTypeName}"</span>?
            <br />
            <br />
            This action cannot be undone and will permanently remove this onboarding type. 
            You cannot delete a type that has active onboarding requests.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete Type'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
