'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Mail, Clock, CheckCircle, AlertCircle, X, Users } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

interface ViewRequestsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onboardingTypeId: string | null
  onboardingTypeName: string | null
}

export function ViewRequestsDialog({
  open,
  onOpenChange,
  onboardingTypeId,
  onboardingTypeName,
}: ViewRequestsDialogProps) {
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()

  const { data: requests, isLoading } = useQuery({
    queryKey: ['type-requests', onboardingTypeId],    queryFn: async () => {
      if (!user || !onboardingTypeId) return []
      
      const { data, error } = await supabase
        .from('onboarding_requests')
        .select(`
          *,
          users:completed_by(company_name, contact_name)
        `)
        .eq('onboarding_type_id', onboardingTypeId)
        .eq('requester_user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // For completed requests, get document counts
      if (data) {
        const requestsWithDocs = await Promise.all(
          data.map(async (request) => {
            if (request.status === 'completed') {
              const { data: docs, error: docsError } = await supabase
                .from('documents')
                .select('id')
                .eq('request_id', request.id)
              
              return {
                ...request,
                documentCount: docsError ? 0 : docs?.length || 0
              }
            }
            return request
          })
        )
        return requestsWithDocs
      }
      
      return data
    },
    enabled: !!user && !!onboardingTypeId && open,
  })

  const cancelRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('onboarding_requests')
        .update({ status: 'expired' })
        .eq('id', requestId)
        .eq('requester_user_id', user.id)
        .eq('status', 'pending')

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['type-requests'] })
      queryClient.invalidateQueries({ queryKey: ['onboarding-types'] })
      queryClient.invalidateQueries({ queryKey: ['onboarding-requests'] })
      toast.success('Request cancelled successfully!')
    },
    onError: (error) => {
      console.error('Error cancelling request:', error)
      toast.error('Failed to cancel request. Please try again.')
    },
  })

  const handleCancelRequest = (requestId: string) => {
    cancelRequestMutation.mutate(requestId)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'expired':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
    }
  }

  const pendingCount = requests?.filter(req => req.status === 'pending').length || 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Requests for &quot;{onboardingTypeName}&quot;
          </DialogTitle>
          <DialogDescription>
            Manage onboarding requests for this type. You can cancel pending requests to allow deletion of the onboarding type.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    </div>
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !requests?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Mail className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
              <p className="text-gray-600 text-center">
                No onboarding requests have been sent for this type yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {pendingCount > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm font-medium">
                    {pendingCount} pending request{pendingCount > 1 ? 's' : ''} found
                  </p>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  Cancel pending requests below to allow deletion of this onboarding type.
                </p>
              </div>
            )}
            
            <div className="space-y-3">
              {requests.map((request) => (
                <Card key={request.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusIcon(request.status)}
                          <h4 className="font-medium text-sm">
                            {request.recipient_email}
                          </h4>
                        </div>                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Sent {formatDate(request.created_at)}</span>
                          {request.completed_at && (
                            <span>Completed {formatDate(request.completed_at)}</span>
                          )}                          {request.status === 'completed' && request.documentCount && (
                            <span>{request.documentCount} documents uploaded</span>
                          )}
                          {request.expires_at && (
                            <span>Expires {formatDate(request.expires_at)}</span>
                          )}
                        </div>
                      </div>
                      <div className="ml-4 flex items-center gap-2">
                        {getStatusBadge(request.status)}
                        {request.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancelRequest(request.id)}
                            disabled={cancelRequestMutation.isPending}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
