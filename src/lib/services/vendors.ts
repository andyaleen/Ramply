import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export interface VendorUser {
  id: string
  email: string
  company_name: string | null
  contact_name: string | null
  contact_email: string | null
  business_type: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string | null
  created_at: string
  updated_at: string | null
}

export interface RequestDocument {
  id: string
  file_name: string
  document_type: string
}

export interface OnboardingRequestWithRelations {
  id: string
  status: string
  recipient_email: string
  created_at: string
  updated_at: string
  completed_at: string | null
  completed_by: string | null
  onboarding_types: {
    id: string
    name: string
  } | {
    id: string
    name: string
  }[]
  documents: RequestDocument[]
}

export interface VendorWithStats {
  id: string
  name: string
  contact_name: string
  email: string
  phone?: string
  address?: string
  status: 'active' | 'pending' | 'inactive' | 'draft'
  business_type?: string
  created_at: string
  last_activity?: string
  total_requests: number
  completed_requests: number
  pending_requests: number
  completion_rate: number
  onboarding_type?: string
  documents: string[]
}

export interface VendorStats {
  total: number
  active: number
  pending: number
  inactive: number
  draft: number
}

class VendorsService {
  private supabase = createClient()
  async getVendorsWithStats(user: User): Promise<VendorWithStats[]> {
    try {
      // Get all onboarding requests created by this user with related data
      const { data: requests, error: requestsError } = await this.supabase
        .from('onboarding_requests')
        .select(`
          id,
          status,
          recipient_email,
          created_at,
          updated_at,
          completed_at,
          completed_by,          
          onboarding_types!inner (
            id,
            name
          ),
          documents (
            id,
            file_name,
            document_type
          )
        `)
        .eq('requester_user_id', user.id)
        .order('created_at', { ascending: false })

      if (requestsError) throw requestsError      // Get user details for completed vendors
      const completedUserIds = requests
        ?.filter(req => req.completed_by)
        .map(req => req.completed_by)
        .filter(Boolean) || []

      let vendorUsers: VendorUser[] = []
      if (completedUserIds.length > 0) {
        const { data: users, error: usersError } = await this.supabase
          .from('users')
          .select(`
            id,
            email,
            company_name,
            contact_name,
            contact_email,
            business_type,
            address_line1,
            address_line2,
            city,
            state,
            postal_code,
            country,
            created_at,
            updated_at
          `)
          .in('id', completedUserIds)

        if (usersError) throw usersError
        vendorUsers = users || []
      }

      // Create a map of user data by user ID
      const userMap = new Map(vendorUsers.map(user => [user.id, user]))      // Group requests by recipient email to create vendor entries
      const vendorMap = new Map<string, VendorWithStats>()

      requests?.forEach(request => {
        const email = request.recipient_email
        if (!email) return

        // Get user data if the request was completed
        const userData = request.completed_by ? userMap.get(request.completed_by) : null

        if (!vendorMap.has(email)) {
          // Create new vendor entry
          const onboardingTypeName = this.getOnboardingTypeName(request.onboarding_types)
          
          const vendor: VendorWithStats = {
            id: userData?.id || request.id,
            name: userData?.company_name || email.split('@')[0],
            contact_name: userData?.contact_name || 'Unknown Contact',
            email: email,            phone: userData?.contact_email || undefined,
            address: userData ? this.formatUserAddress(userData) : undefined,
            business_type: userData?.business_type || undefined,
            created_at: request.created_at,
            last_activity: request.updated_at,
            status: this.mapRequestStatusToVendorStatus(request.status),
            total_requests: 0,
            completed_requests: 0,
            pending_requests: 0,
            completion_rate: 0,
            onboarding_type: onboardingTypeName,
            documents: []
          }
          vendorMap.set(email, vendor)
        }

        const vendor = vendorMap.get(email)!
        
        // Update vendor statistics
        vendor.total_requests++
        if (request.status === 'completed') {
          vendor.completed_requests++
        } else if (request.status === 'pending') {
          vendor.pending_requests++
        }

        // Update last activity if this request is newer
        if (new Date(request.updated_at) > new Date(vendor.last_activity || '')) {
          vendor.last_activity = request.updated_at
          vendor.status = this.mapRequestStatusToVendorStatus(request.status)
        }        // Collect documents
        if (request.documents) {
          request.documents.forEach((doc: RequestDocument) => {
            if (doc.file_name && !vendor.documents.includes(doc.file_name)) {
              vendor.documents.push(doc.file_name)
            }
          })
        }
      })

      // Calculate completion rates
      const vendors = Array.from(vendorMap.values()).map(vendor => ({
        ...vendor,
        completion_rate: vendor.total_requests > 0 
          ? Math.round((vendor.completed_requests / vendor.total_requests) * 100)
          : 0
      }))

      return vendors
    } catch (error) {
      console.error('Error fetching vendors with stats:', error)
      throw error
    }
  }

  async getVendorStats(user: User): Promise<VendorStats> {
    try {
      const vendors = await this.getVendorsWithStats(user)
      
      return {
        total: vendors.length,
        active: vendors.filter(v => v.status === 'active').length,
        pending: vendors.filter(v => v.status === 'pending').length,
        inactive: vendors.filter(v => v.status === 'inactive').length,
        draft: vendors.filter(v => v.status === 'draft').length
      }
    } catch (error) {
      console.error('Error fetching vendor stats:', error)
      throw error
    }
  }

  private mapRequestStatusToVendorStatus(requestStatus: string): 'active' | 'pending' | 'inactive' | 'draft' {
    switch (requestStatus) {
      case 'completed':
        return 'active'
      case 'pending':
        return 'pending'
      case 'expired':
        return 'inactive'
      case 'draft':
        return 'draft'
      default:
        return 'pending'
    }
  }

  private getOnboardingTypeName(onboardingTypes: { id: string; name: string } | { id: string; name: string }[]): string {
    if (Array.isArray(onboardingTypes)) {
      return onboardingTypes[0]?.name || 'Unknown Type'
    }
    return onboardingTypes?.name || 'Unknown Type'
  }

  // Helper functions for display
  getVendorDisplayName(vendor: VendorWithStats): string {
    return vendor.name || vendor.contact_name || 'Unknown Vendor'
  }

  getContactDisplayName(vendor: VendorWithStats): string {
    return vendor.contact_name || 'Unknown Contact'
  }
  formatAddress(vendor: VendorWithStats): string {
    return vendor.address || 'No address provided'
  }
  private formatUserAddress(user: VendorUser): string {
    const parts = [
      user.address_line1,
      user.address_line2,
      user.city,
      user.state,
      user.postal_code,
      user.country
    ].filter(Boolean)
    
    return parts.length > 0 ? parts.join(', ') : 'No address provided'
  }

  formatPhone(vendor: VendorWithStats): string {
    return vendor.phone || 'No phone provided'
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'active':
        return 'text-green-600'
      case 'pending':
        return 'text-yellow-600'
      case 'inactive':
        return 'text-red-600'
      case 'draft':
        return 'text-gray-600'
      default:
        return 'text-gray-600'
    }
  }

  formatJoinedDate(vendor: VendorWithStats): string {
    return new Date(vendor.created_at).toLocaleDateString()
  }

  formatLastActivity(vendor: VendorWithStats): string {
    if (!vendor.last_activity) return 'No activity'
    return new Date(vendor.last_activity).toLocaleDateString()
  }
}

export const vendorsService = new VendorsService()
