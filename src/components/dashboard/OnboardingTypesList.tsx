'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Copy, Users, Calendar, MoreHorizontal } from 'lucide-react'
import { formatDate, generateToken } from '@/lib/utils'
import { SendOnboardingRequestDialog } from './SendOnboardingRequestDialog'

export function OnboardingTypesList() {
  const { user } = useAuth()
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null)
  const [showSendDialog, setShowSendDialog] = useState(false)
  const supabase = createClient()

  const { data: onboardingTypes, isLoading } = useQuery({
    queryKey: ['onboarding-types', user?.id],
    queryFn: async () => {
      if (!user) return []
      
      const { data, error } = await supabase
        .from('onboarding_types')
        .select(`
          *,
          onboarding_requests(count)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!user,
  })

  const handleSendRequest = (typeId: string) => {
    setSelectedTypeId(typeId)
    setShowSendDialog(true)
  }

  const copyOnboardingLink = async (typeId: string) => {
    // Generate a token for the onboarding request
    const token = generateToken()
    const link = `${window.location.origin}/onboard/${token}`
    
    try {
      await navigator.clipboard.writeText(link)
      // You would typically show a toast notification here
      console.log('Link copied to clipboard')
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!onboardingTypes?.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No onboarding types yet</h3>
          <p className="text-gray-600 text-center mb-4">
            Create your first onboarding flow to start collecting vendor information
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {onboardingTypes.map((type) => (
          <Card key={type.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{type.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {type.description || 'No description provided'}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {type.required_documents && type.required_documents.length > 0 && (
                  <Badge variant="outline">
                    {type.required_documents.length} Documents
                  </Badge>
                )}
                {type.required_fields && type.required_fields.length > 0 && (
                  <Badge variant="outline">
                    {type.required_fields.length} Fields
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    0 requests
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(type.created_at)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleSendRequest(type.id)}
                >
                  Send Request
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyOnboardingLink(type.id)}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy Link
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <SendOnboardingRequestDialog
        open={showSendDialog}
        onOpenChange={setShowSendDialog}
        onboardingTypeId={selectedTypeId}
        onSuccess={() => setShowSendDialog(false)}
      />
    </>
  )
}
