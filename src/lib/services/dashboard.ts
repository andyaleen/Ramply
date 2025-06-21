import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { RequiredField, RequiredDocument } from './requests'

interface OnboardingRequest {
  id: string
  status: 'pending' | 'completed' | 'expired'
  created_at: string
  completed_at: string | null
}

interface OnboardingTypeFromDB {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
  user_id: string
  required_fields: RequiredField[]
  required_documents: RequiredDocument[]
  onboarding_requests: OnboardingRequest[]
}

export interface DashboardStats {
  totalOnboardingTypes: number
  pendingRequests: number
  completedThisMonth: number
  totalVendors: number
}

export interface OnboardingTypeWithStats {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
  user_id: string
  required_fields: RequiredField[]
  required_documents: RequiredDocument[]
  totalRequests: number
  completedRequests: number
  pendingRequests: number
  completionRate: number
}

export interface RecentActivity {
  id: string
  action: string
  type: string
  time: string
  status: 'pending' | 'completed' | 'in-progress' | 'info'
  details?: string
}

export class DashboardService {
  private supabase = createClient()
  async getDashboardStats(user: User): Promise<DashboardStats> {
    console.log('DashboardService: Fetching stats for user:', user)
    try {
      console.log('DashboardService: Fetching stats for user:', user.id)
      
      // Get total onboarding types
      const { count: totalTypes, error: typesError } = await this.supabase
        .from('onboarding_types')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if (typesError) {
        console.error('Error fetching onboarding types count:', typesError)
      }
      console.log('Total onboarding types:', totalTypes)

      // Get pending requests
      const { count: pendingRequests, error: pendingError } = await this.supabase
        .from('onboarding_requests')
        .select('*', { count: 'exact', head: true })
        // .eq('requester_user_id', user.id)
        .eq('status', 'pending')

        console.log('DashboardService: Fetching pending requests for user:', user.id)

      if (pendingError) {
        console.error('Error fetching pending requests count:', pendingError)
      }
      console.log('Pending requests:', pendingRequests)

      // Get completed requests this month
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { count: completedThisMonth, error: completedError } = await this.supabase
        .from('onboarding_requests')
        .select('*', { count: 'exact', head: true })
        // .eq('requester_user_id', user.id)
        .eq('status', 'completed')
        .gte('completed_at', startOfMonth.toISOString())

      if (completedError) {
        console.error('Error fetching completed requests count:', completedError)
      }
      console.log('Completed this month:', completedThisMonth)

      // Get total unique vendors (users who have completed at least one request)
      const { data: vendorData, error: vendorError } = await this.supabase
        .from('onboarding_requests')
        .select('completed_by')
        .eq('requester_user_id', user.id)
        .eq('status', 'completed')
        .not('completed_by', 'is', null)

      if (vendorError) {
        console.error('Error fetching vendor data:', vendorError)
      }

      // Count unique vendors
      const uniqueVendors = new Set(vendorData?.map(v => v.completed_by) || [])
      const totalVendors = uniqueVendors.size
      console.log('Total unique vendors:', totalVendors)

      const stats = {
        totalOnboardingTypes: totalTypes || 0,
        pendingRequests: pendingRequests || 0,
        completedThisMonth: completedThisMonth || 0,
        totalVendors: totalVendors || 0
      }

      console.log('Final dashboard stats:', stats)
      return stats
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      throw error
    }
  }
  async getOnboardingTypesWithStats(user: User): Promise<OnboardingTypeWithStats[]> {
    try {
      const { data: onboardingTypes, error } = await this.supabase
        .from('onboarding_types')
        .select(`
          *,
          onboarding_requests (
            id,
            status,
            created_at,
            completed_at
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      return (onboardingTypes || []).map((type: OnboardingTypeFromDB) => {
        const requests = type.onboarding_requests || []
        const totalRequests = requests.length
        const completedRequests = requests.filter((r: OnboardingRequest) => r.status === 'completed').length
        const pendingRequests = requests.filter((r: OnboardingRequest) => r.status === 'pending').length
        const completionRate = totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0

        return {
          id: type.id,
          name: type.name,
          description: type.description,
          created_at: type.created_at,
          updated_at: type.updated_at,
          user_id: type.user_id,
          required_fields: type.required_fields || [],
          required_documents: type.required_documents || [],
          totalRequests,
          completedRequests,
          pendingRequests,
          completionRate: Math.round(completionRate)
        }
      })
    } catch (error) {
      console.error('Error fetching onboarding types with stats:', error)
      throw error
    }
  }

  async getRecentActivity(user: User, limit = 10): Promise<RecentActivity[]> {
    try {
      // Get recent onboarding requests
      const { data: requests, error: requestsError } = await this.supabase
        .from('onboarding_requests')
        .select(`
          id,
          status,
          recipient_email,
          created_at,
          completed_at,
          updated_at,
          onboarding_types (
            name
          )
        `)
        .eq('requester_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (requestsError) throw requestsError

      // Get recently created onboarding types
      const { data: types, error: typesError } = await this.supabase
        .from('onboarding_types')
        .select('id, name, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (typesError) throw typesError

      const activities: RecentActivity[] = []      // Add request activities
      requests?.forEach(request => {
        const typeName = this.getOnboardingTypeName(request.onboarding_types)
        
        if (request.status === 'completed' && request.completed_at) {
          activities.push({
            id: `completed-${request.id}`,
            action: 'Onboarding completed',
            type: typeName,
            time: this.formatTimeAgo(request.completed_at),
            status: 'completed',
            details: `by ${request.recipient_email}`
          })
        } else if (request.status === 'pending') {
          activities.push({
            id: `pending-${request.id}`,
            action: 'New onboarding request submitted',
            type: typeName,
            time: this.formatTimeAgo(request.created_at),
            status: 'pending',
            details: `to ${request.recipient_email}`
          })
        }
      })

      // Add type creation activities
      types?.forEach(type => {
        activities.push({
          id: `created-${type.id}`,
          action: 'New onboarding type created',
          type: type.name,
          time: this.formatTimeAgo(type.created_at),
          status: 'info'
        })
      })

      // Sort by time and return limited results
      return activities
        .sort((a, b) => {
          // Convert time strings back to dates for sorting
          const timeA = this.parseTimeAgo(a.time)
          const timeB = this.parseTimeAgo(b.time)
          return timeB.getTime() - timeA.getTime()
        })
        .slice(0, limit)

    } catch (error) {
      console.error('Error fetching recent activity:', error)
      throw error
    }
  }

  private formatTimeAgo(dateString: string): string {
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

  private parseTimeAgo(timeString: string): Date {
    // Simple parsing for sorting - in a real app you'd store the actual dates
    const now = new Date()
    
    if (timeString === 'Just now') {
      return now
    }
    
    const match = timeString.match(/(\d+)\s+(minute|hour|day)s?\s+ago/)
    if (match) {
      const value = parseInt(match[1])
      const unit = match[2]
      
      switch (unit) {
        case 'minute':
          return new Date(now.getTime() - value * 60 * 1000)
        case 'hour':
          return new Date(now.getTime() - value * 60 * 60 * 1000)
        case 'day':
          return new Date(now.getTime() - value * 24 * 60 * 60 * 1000)
      }
    }
    
    // Fallback for date strings
    return new Date(timeString)
  }
  private getOnboardingTypeName(onboardingTypes: { name: string } | { name: string }[] | null | undefined): string {
    if (Array.isArray(onboardingTypes)) {
      return onboardingTypes[0]?.name || 'Unknown Type'
    }
    return onboardingTypes?.name || 'Unknown Type'
  }

  async getExternalUserStats(user: User): Promise<DashboardStats> {
    try {
      // Get total requests received by this user's email
      const { count: totalRequests } = await this.supabase
        .from('onboarding_requests')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_email', user.email)

      // Get pending requests for this user
      const { count: pendingRequests } = await this.supabase
        .from('onboarding_requests')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_email', user.email)
        .eq('status', 'pending')

      // Get completed requests this month for this user
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { count: completedThisMonth } = await this.supabase
        .from('onboarding_requests')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_email', user.email)
        .eq('status', 'completed')
        .gte('completed_at', startOfMonth.toISOString())

      // Get unique companies that have sent requests to this user
      const { data: uniqueCompanies } = await this.supabase
        .from('onboarding_requests')
        .select('requester_user_id')
        .eq('recipient_email', user.email)
        .eq('status', 'completed')

      const uniqueCompanyCount = uniqueCompanies 
        ? new Set(uniqueCompanies.map(req => req.requester_user_id)).size 
        : 0

      return {
        totalOnboardingTypes: totalRequests || 0,
        pendingRequests: pendingRequests || 0,
        completedThisMonth: completedThisMonth || 0,
        totalVendors: uniqueCompanyCount
      }
    } catch (error) {
      console.error('Error fetching external user stats:', error)
      throw error
    }
  }
}

export const dashboardService = new DashboardService()
