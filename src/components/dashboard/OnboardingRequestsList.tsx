'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Mail, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export function OnboardingRequestsList() {
  const { user } = useAuth()
  const supabase = createClient()

  const { data: requests, isLoading } = useQuery({
    queryKey: ['onboarding-requests', user?.id],
    queryFn: async () => {
      if (!user) return []
      
      const { data, error } = await supabase
        .from('onboarding_requests')
        .select(`
          *,
          onboarding_types(name),
          users:completed_by(company_name, contact_name)
        `)
        .eq('requester_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      return data
    },
    enabled: !!user,
  })

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

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
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
    )
  }

  if (!requests?.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Mail className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No requests sent yet</h3>
          <p className="text-gray-600 text-center">
            Start by creating an onboarding type and sending your first request
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <Card key={request.id} className="hover:shadow-sm transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {getStatusIcon(request.status)}
                  <h4 className="font-medium text-sm">
                    {request.onboarding_types?.name || 'Unknown Type'}
                  </h4>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Sent to: {request.recipient_email}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>Sent {formatDate(request.created_at)}</span>
                  {request.completed_at && (
                    <span>Completed {formatDate(request.completed_at)}</span>
                  )}
                </div>
              </div>
              <div className="ml-4">
                {getStatusBadge(request.status)}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
