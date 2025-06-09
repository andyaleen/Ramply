import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

export interface OnboardingRequestDetailed {
  id: string
  onboarding_type_id: string
  requester_user_id: string
  token: string
  recipient_email: string
  expires_at: string | null
  status: 'pending' | 'completed' | 'expired'
  completed_by: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  onboarding_types: {
    id: string
    name: string
    description: string | null
    required_fields: any[]
    required_documents: any[]
  } | null
  completed_by_user: {
    id: string
    contact_name: string | null
    email: string
    company_name: string | null
  } | null
  documentsCount?: number
  completionPercentage?: number
}

export interface RequestsStats {
  total: number
  pending: number
  completed: number
  expired: number
}

export class RequestsService {
  private supabase = createClient()

  async getRequestsStats(user: User): Promise<RequestsStats> {
    try {
      const { data: requests, error } = await this.supabase
        .from('onboarding_requests')
        .select('status')
        .eq('requester_user_id', user.id)

      if (error) throw error

      const stats = {
        total: requests?.length || 0,
        pending: requests?.filter(r => r.status === 'pending').length || 0,
        completed: requests?.filter(r => r.status === 'completed').length || 0,
        expired: requests?.filter(r => r.status === 'expired').length || 0
      }

      return stats
    } catch (error) {
      console.error('Error fetching requests stats:', error)
      throw error
    }
  }

  async getDetailedRequests(user: User): Promise<OnboardingRequestDetailed[]> {
    try {
      const { data: requests, error } = await this.supabase
        .from('onboarding_requests')
        .select(`
          *,
          onboarding_types (
            id,
            name,
            description,
            required_fields,
            required_documents
          ),
          completed_by_user:users!onboarding_requests_completed_by_fkey (
            id,
            contact_name,
            email,
            company_name
          )
        `)
        .eq('requester_user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // For each request, get document count if completed
      const requestsWithDocuments = await Promise.all(
        (requests || []).map(async (request) => {
          let documentsCount = 0
          let completionPercentage = 0

          if (request.status === 'completed' && request.completed_by) {
            // Get documents count for this request
            const { count } = await this.supabase
              .from('documents')
              .select('*', { count: 'exact', head: true })
              .eq('request_id', request.id)

            documentsCount = count || 0

            // Calculate completion percentage based on required documents
            const requiredDocuments = request.onboarding_types?.required_documents || []
            if (requiredDocuments.length > 0) {
              completionPercentage = Math.round((documentsCount / requiredDocuments.length) * 100)
            } else {
              completionPercentage = request.status === 'completed' ? 100 : 0
            }
          } else if (request.status === 'pending') {
            // For pending requests, we can estimate based on time elapsed
            const hoursElapsed = Math.floor(
              (new Date().getTime() - new Date(request.created_at).getTime()) / (1000 * 60 * 60)
            )
            // Estimate completion based on time (this is just for demonstration)
            completionPercentage = Math.min(hoursElapsed * 10, 80) // Max 80% for pending
          }

          return {
            ...request,
            documentsCount,
            completionPercentage: Math.max(0, Math.min(100, completionPercentage))
          }
        })
      )

      return requestsWithDocuments
    } catch (error) {
      console.error('Error fetching detailed requests:', error)
      throw error
    }
  }

  formatTimeAgo(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) {
      return 'Just now'
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `${hours} hour${hours > 1 ? 's' : ''} ago`
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400)
      return `${days} day${days > 1 ? 's' : ''} ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  getVendorDisplayName(request: OnboardingRequestDetailed): string {
    if (request.completed_by_user?.company_name) {
      return request.completed_by_user.company_name
    }
    if (request.completed_by_user?.contact_name) {
      return request.completed_by_user.contact_name
    }
    if (request.recipient_email) {
      return request.recipient_email.split('@')[0] // Use part before @ as fallback
    }
    return 'Unknown Vendor'
  }

  getContactEmail(request: OnboardingRequestDetailed): string {
    if (request.completed_by_user?.email) {
      return request.completed_by_user.email
    }
    return request.recipient_email
  }
}

export const requestsService = new RequestsService()
