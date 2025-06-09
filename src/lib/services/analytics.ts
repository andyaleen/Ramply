import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

export interface AnalyticsData {
  overviewStats: OverviewStats
  completionTrends: CompletionTrend[]
  onboardingTypePerformance: OnboardingTypePerformance[]
  vendorStatusDistribution: StatusDistribution[]
  documentAnalytics: DocumentAnalytics
  recentCompletions: RecentCompletion[]
  timeToComplete: TimeToCompleteData
}

export interface OverviewStats {
  totalRequests: number
  completedRequests: number
  pendingRequests: number
  expiredRequests: number
  averageCompletionRate: number
  totalVendors: number
  activeOnboardingTypes: number
  totalDocumentsUploaded: number
}

export interface CompletionTrend {
  date: string
  completed: number
  pending: number
  expired: number
}

export interface OnboardingTypePerformance {
  id: string
  name: string
  totalRequests: number
  completedRequests: number
  pendingRequests: number
  expiredRequests: number
  completionRate: number
  averageTimeToComplete: number | null
  documentsRequired: number
}

export interface StatusDistribution {
  status: string
  count: number
  percentage: number
}

export interface DocumentAnalytics {
  totalDocuments: number
  averageDocumentsPerRequest: number
  mostUploadedDocumentTypes: DocumentTypeCount[]
  documentsUploadedToday: number
  documentsUploadedThisWeek: number
  documentsUploadedThisMonth: number
}

export interface DocumentTypeCount {
  documentType: string
  count: number
}

export interface RecentCompletion {
  id: string
  vendorName: string
  vendorEmail: string
  onboardingTypeName: string
  completedAt: string
  timeToComplete: string
  documentsSubmitted: number
}

export interface TimeToCompleteData {
  averageDays: number
  fastest: number
  slowest: number
  median: number
  distribution: TimeDistribution[]
}

export interface TimeDistribution {
  range: string
  count: number
}

class AnalyticsService {
  private supabase = createClient()

  async getAnalyticsData(user: User): Promise<AnalyticsData> {
    try {
      const [
        overviewStats,
        completionTrends,
        onboardingTypePerformance,
        vendorStatusDistribution,
        documentAnalytics,
        recentCompletions,
        timeToComplete
      ] = await Promise.all([
        this.getOverviewStats(user),
        this.getCompletionTrends(user),
        this.getOnboardingTypePerformance(user),
        this.getVendorStatusDistribution(user),
        this.getDocumentAnalytics(user),
        this.getRecentCompletions(user),
        this.getTimeToCompleteData(user)
      ])

      return {
        overviewStats,
        completionTrends,
        onboardingTypePerformance,
        vendorStatusDistribution,
        documentAnalytics,
        recentCompletions,
        timeToComplete
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error)
      throw error
    }
  }

  private async getOverviewStats(user: User): Promise<OverviewStats> {
    // Get all requests for this user
    const { data: requests, error: requestsError } = await this.supabase
      .from('onboarding_requests')
      .select('status, completed_at, created_at')
      .eq('requester_user_id', user.id)

    if (requestsError) throw requestsError

    // Get onboarding types count
    const { data: types, error: typesError } = await this.supabase
      .from('onboarding_types')
      .select('id')
      .eq('user_id', user.id)

    if (typesError) throw typesError

    // Get documents count
    const { data: documents, error: documentsError } = await this.supabase
      .from('documents')
      .select('id')
      .eq('user_id', user.id)

    if (documentsError) throw documentsError

    // Get unique vendors count
    const { data: vendors, error: vendorsError } = await this.supabase
      .from('onboarding_requests')
      .select('recipient_email')
      .eq('requester_user_id', user.id)

    if (vendorsError) throw vendorsError

    const totalRequests = requests?.length || 0
    const completedRequests = requests?.filter(r => r.status === 'completed').length || 0
    const pendingRequests = requests?.filter(r => r.status === 'pending').length || 0
    const expiredRequests = requests?.filter(r => r.status === 'expired').length || 0
    const averageCompletionRate = totalRequests > 0 ? Math.round((completedRequests / totalRequests) * 100) : 0
    const totalVendors = new Set(vendors?.map(v => v.recipient_email)).size || 0
    const activeOnboardingTypes = types?.length || 0
    const totalDocumentsUploaded = documents?.length || 0

    return {
      totalRequests,
      completedRequests,
      pendingRequests,
      expiredRequests,
      averageCompletionRate,
      totalVendors,
      activeOnboardingTypes,
      totalDocumentsUploaded
    }
  }

  private async getCompletionTrends(user: User, days: number = 30): Promise<CompletionTrend[]> {
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000))

    const { data: requests, error } = await this.supabase
      .from('onboarding_requests')
      .select('status, created_at, completed_at, updated_at')
      .eq('requester_user_id', user.id)
      .gte('created_at', startDate.toISOString())

    if (error) throw error

    // Group by date
    const trends: { [key: string]: { completed: number; pending: number; expired: number } } = {}
    
    // Initialize all dates
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000))
      const dateKey = date.toISOString().split('T')[0]
      trends[dateKey] = { completed: 0, pending: 0, expired: 0 }
    }

    // Count status changes by date
    requests?.forEach(request => {
      const createdDate = new Date(request.created_at).toISOString().split('T')[0]
      
      if (request.status === 'completed' && request.completed_at) {
        const completedDate = new Date(request.completed_at).toISOString().split('T')[0]
        if (trends[completedDate]) {
          trends[completedDate].completed++
        }
      } else if (request.status === 'pending') {
        if (trends[createdDate]) {
          trends[createdDate].pending++
        }
      } else if (request.status === 'expired') {
        if (trends[createdDate]) {
          trends[createdDate].expired++
        }
      }
    })

    return Object.entries(trends).map(([date, counts]) => ({
      date,
      ...counts
    })).sort((a, b) => a.date.localeCompare(b.date))
  }

  private async getOnboardingTypePerformance(user: User): Promise<OnboardingTypePerformance[]> {
    const { data: types, error } = await this.supabase
      .from('onboarding_types')
      .select(`
        id,
        name,
        required_documents,
        onboarding_requests (
          id,
          status,
          created_at,
          completed_at
        )
      `)
      .eq('user_id', user.id)

    if (error) throw error

    return (types || []).map(type => {
      const requests = type.onboarding_requests || []
      const totalRequests = requests.length
      const completedRequests = requests.filter(r => r.status === 'completed').length
      const pendingRequests = requests.filter(r => r.status === 'pending').length
      const expiredRequests = requests.filter(r => r.status === 'expired').length
      const completionRate = totalRequests > 0 ? Math.round((completedRequests / totalRequests) * 100) : 0
      
      // Calculate average time to complete
      const completedWithTime = requests.filter(r => r.status === 'completed' && r.completed_at)
      const averageTimeToComplete = completedWithTime.length > 0 
        ? completedWithTime.reduce((acc, r) => {
            const created = new Date(r.created_at).getTime()
            const completed = new Date(r.completed_at!).getTime()
            return acc + (completed - created)
          }, 0) / completedWithTime.length / (1000 * 60 * 60 * 24) // Convert to days
        : null

      const documentsRequired = Array.isArray(type.required_documents) ? type.required_documents.length : 0

      return {
        id: type.id,
        name: type.name,
        totalRequests,
        completedRequests,
        pendingRequests,
        expiredRequests,
        completionRate,
        averageTimeToComplete: averageTimeToComplete ? Math.round(averageTimeToComplete * 10) / 10 : null,
        documentsRequired
      }
    })
  }

  private async getVendorStatusDistribution(user: User): Promise<StatusDistribution[]> {
    const { data: requests, error } = await this.supabase
      .from('onboarding_requests')
      .select('status')
      .eq('requester_user_id', user.id)

    if (error) throw error

    const statusCounts: { [key: string]: number } = {}
    requests?.forEach(request => {
      statusCounts[request.status] = (statusCounts[request.status] || 0) + 1
    })

    const total = requests?.length || 0
    
    return Object.entries(statusCounts).map(([status, count]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1),
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    }))
  }

  private async getDocumentAnalytics(user: User): Promise<DocumentAnalytics> {
    // Get all documents for requests created by this user
    const { data: documents, error } = await this.supabase
      .from('documents')
      .select(`
        id,
        document_type,
        uploaded_at,
        request_id,
        onboarding_requests!inner (
          requester_user_id
        )
      `)
      .eq('onboarding_requests.requester_user_id', user.id)

    if (error) throw error

    const totalDocuments = documents?.length || 0
    
    // Get total requests to calculate average
    const { data: requests, error: requestsError } = await this.supabase
      .from('onboarding_requests')
      .select('id')
      .eq('requester_user_id', user.id)

    if (requestsError) throw requestsError

    const totalRequests = requests?.length || 0
    const averageDocumentsPerRequest = totalRequests > 0 ? Math.round((totalDocuments / totalRequests) * 10) / 10 : 0

    // Count document types
    const documentTypeCounts: { [key: string]: number } = {}
    documents?.forEach(doc => {
      documentTypeCounts[doc.document_type] = (documentTypeCounts[doc.document_type] || 0) + 1
    })

    const mostUploadedDocumentTypes = Object.entries(documentTypeCounts)
      .map(([type, count]) => ({ documentType: type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Calculate time-based document counts
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thisWeek = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000))
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const documentsUploadedToday = documents?.filter(d => 
      new Date(d.uploaded_at) >= today
    ).length || 0

    const documentsUploadedThisWeek = documents?.filter(d => 
      new Date(d.uploaded_at) >= thisWeek
    ).length || 0

    const documentsUploadedThisMonth = documents?.filter(d => 
      new Date(d.uploaded_at) >= thisMonth
    ).length || 0

    return {
      totalDocuments,
      averageDocumentsPerRequest,
      mostUploadedDocumentTypes,
      documentsUploadedToday,
      documentsUploadedThisWeek,
      documentsUploadedThisMonth
    }
  }

  private async getRecentCompletions(user: User, limit: number = 10): Promise<RecentCompletion[]> {
    const { data: completions, error } = await this.supabase
      .from('onboarding_requests')
      .select(`
        id,
        recipient_email,
        completed_at,
        created_at,
        onboarding_types (
          name
        ),
        completed_by_user:users!onboarding_requests_completed_by_fkey (
          contact_name,
          company_name
        ),
        documents (
          id
        )
      `)
      .eq('requester_user_id', user.id)
      .eq('status', 'completed')
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return (completions || []).map(completion => {
      // Handle the case where related data comes as arrays
      const completedByUser = Array.isArray(completion.completed_by_user) 
        ? completion.completed_by_user[0] 
        : completion.completed_by_user
      const onboardingType = Array.isArray(completion.onboarding_types)
        ? completion.onboarding_types[0]
        : completion.onboarding_types

      const vendorName = completedByUser?.contact_name || 
                        completedByUser?.company_name || 
                        'Unknown'
      const timeToComplete = this.calculateTimeToComplete(completion.created_at, completion.completed_at!)
      
      return {
        id: completion.id,
        vendorName,
        vendorEmail: completion.recipient_email,
        onboardingTypeName: onboardingType?.name || 'Unknown',
        completedAt: completion.completed_at!,
        timeToComplete,
        documentsSubmitted: completion.documents?.length || 0
      }
    })
  }

  private async getTimeToCompleteData(user: User): Promise<TimeToCompleteData> {
    const { data: completedRequests, error } = await this.supabase
      .from('onboarding_requests')
      .select('created_at, completed_at')
      .eq('requester_user_id', user.id)
      .eq('status', 'completed')
      .not('completed_at', 'is', null)

    if (error) throw error

    if (!completedRequests || completedRequests.length === 0) {
      return {
        averageDays: 0,
        fastest: 0,
        slowest: 0,
        median: 0,
        distribution: []
      }
    }

    // Calculate time to complete in days for each request
    const completionTimes = completedRequests.map(request => {
      const created = new Date(request.created_at).getTime()
      const completed = new Date(request.completed_at!).getTime()
      return Math.round((completed - created) / (1000 * 60 * 60 * 24))
    }).sort((a, b) => a - b)

    const averageDays = Math.round(completionTimes.reduce((acc, time) => acc + time, 0) / completionTimes.length)
    const fastest = completionTimes[0]
    const slowest = completionTimes[completionTimes.length - 1]
    const median = completionTimes[Math.floor(completionTimes.length / 2)]

    // Create distribution ranges
    const distribution: TimeDistribution[] = [
      { range: '0-1 days', count: 0 },
      { range: '2-7 days', count: 0 },
      { range: '8-14 days', count: 0 },
      { range: '15-30 days', count: 0 },
      { range: '30+ days', count: 0 }
    ]

    completionTimes.forEach(time => {
      if (time <= 1) distribution[0].count++
      else if (time <= 7) distribution[1].count++
      else if (time <= 14) distribution[2].count++
      else if (time <= 30) distribution[3].count++
      else distribution[4].count++
    })

    return {
      averageDays,
      fastest,
      slowest,
      median,
      distribution
    }
  }

  private calculateTimeToComplete(createdAt: string, completedAt: string): string {
    const created = new Date(createdAt)
    const completed = new Date(completedAt)
    const diffMs = completed.getTime() - created.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (diffDays === 0) {
      return `${diffHours} hours`
    } else if (diffDays === 1) {
      return '1 day'
    } else {
      return `${diffDays} days`
    }
  }
}

export const analyticsService = new AnalyticsService()
