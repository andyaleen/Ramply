'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Mail, Clock, CheckCircle, AlertCircle, ChevronRightIcon, ChevronLeftIcon } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useState } from 'react'

export function ExternalRequestsList() {
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1);
  const limit = 10;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data: requests, isLoading } = useQuery({
    queryKey: ['external-onboarding-requests', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('onboarding_requests')
        .select(`
          *,
          onboarding_types(name, description),
          users:requester_user_id(company_name, contact_name)
        `)
        .eq('recipient_email', user.email)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) {
        console.error('Error fetching external requests:', error)
        throw error
      }
      return data
    },
    enabled: !!user?.email,
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
        return <Badge className="bg-red-100 text-red-800">Expired</Badge>
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
    }
  }
  const handleBackwardPage = () => {
    if (page > 1) {
      setPage((prev) => prev - 1);
    }
  };

  const handleForwardPage = () => {
    setPage((prev) => prev + 1);
    queryClient.invalidateQueries({
      queryKey: ['external-onboarding-requests', user?.id],
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
        <button>dd</button>
      </div>
    )
  }

  if (!requests?.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Mail className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No requests yet</h3>
          <p className="text-gray-600 text-center">
            You haven&apos;t received any onboarding requests yet
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
                  From: {request.users?.company_name || 'Unknown Company'}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>Received {formatDate(request.created_at)}</span>
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
      <div className="flex gap-3">
        <button onClick={handleBackwardPage}>
          <ChevronLeftIcon />
        </button>
        <span>count</span>
        <button onClick={handleForwardPage}>
          <ChevronRightIcon />
        </button>
      </div>
    </div>
  )
}
