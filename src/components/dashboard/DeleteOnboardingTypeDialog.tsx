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
      if (!user || !onboardingTypeId) 
        {
        throw new Error('Missing user or onboarding type ID')
      }

      // Check if there are any pending onboarding requests associated with this type
      const { data: pendingRequests, error: requestsError } = await supabase
        .from('onboarding_requests')
        .select('id, recipient_email, status')
        .eq('onboarding_type_id', onboardingTypeId)
        .eq('status', 'pending')

      if (requestsError) {
        console.error('Error checking pending requests:', requestsError)
        throw new Error('Failed to check for pending requests')
      }

      if (pendingRequests && pendingRequests.length > 0) {
        const errorMessage = `Cannot delete onboarding type with ${pendingRequests.length} pending request${pendingRequests.length > 1 ? 's' : ''}`
        throw new Error(errorMessage)
      }

      // Delete the onboarding type
      const { error } = await supabase
        .from('onboarding_types')
        .delete()
        .eq('id', onboardingTypeId)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error deleting onboarding type:', error)
        throw new Error('Failed to delete onboarding type')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-types'] })
      toast.success('Onboarding type deleted successfully!')
      onSuccess()
    },      onError: (error) => {
      // Don't log expected business rule errors to console
      const isBusinessRuleError = error.message.includes('pending request') || 
                                   error.message.includes('check for pending requests')
      
      if (!isBusinessRuleError) {
        console.error('Unexpected error deleting onboarding type:', error)
      }
        // Provide specific error messages based on the error type
      if (error.message.includes('pending request')) {
        toast.error('Cannot delete this onboarding type because it has pending requests. Go to the Requests tab to cancel them, or wait for them to be completed or expired.')
      } else if (error.message.includes('check for pending requests')) {
        toast.error('Failed to verify if this onboarding type can be deleted. Please try again.')
      } else if (error.message.includes('Failed to delete')) {
        toast.error('An error occurred while deleting the onboarding type. Please try again.')
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
            <span className="font-medium">&quot;{onboardingTypeName}&quot;</span>?
            <br />
            <br />            This action cannot be undone and will permanently remove this onboarding type. 
            <br />
            <br />
            <strong>Note:</strong> You cannot delete a type that has pending onboarding requests. 
            Completed and expired requests will not prevent deletion.
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
