'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Calendar } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export function ExternalOnboardingTypesList() {
  const supabase = createClient()

  const { data: onboardingTypes, isLoading } = useQuery({
    queryKey: ['public-onboarding-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onboarding_types')
        .select(`
          *,
          users:user_id(company_name, contact_name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
  })

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
          <h3 className="text-lg font-medium text-gray-900 mb-2">No onboarding types available</h3>
          <p className="text-gray-600 text-center mb-4">
            There are no public onboarding flows available at this time
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
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
                <p className="text-sm text-gray-500 mt-2">
                  By {type.users?.company_name || 'Unknown Company'}
                </p>
              </div>
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

            <div className="flex items-center justify-between text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Created {formatDate(type.created_at)}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
