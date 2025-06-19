import { createClient } from '@/lib/supabase/client'

export interface ProfileData {
  company_name?: string | null
  contact_name?: string | null
  contact_email?: string | null
  tax_id?: string | null
  business_type?: string | null
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  state?: string | null
  postal_code?: string | null
  country?: string | null
}

export interface ExtendedProfileData extends ProfileData {
  contact_phone?: string
  tax_classification?: string
  tax_exemption?: string
  bank_name?: string
  account_type?: string
  routing_number?: string
  insurance_provider?: string
  policy_number?: string
  coverage_amount?: string
  certifications?: string
  licenses?: string
}

/**
 * Get existing profile data for a user
 */
export async function getUserProfileData(userId: string): Promise<ProfileData | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('users')
    .select(`
      company_name,
      contact_name,
      contact_email,
      tax_id,
      business_type,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      country
    `)
    .eq('id', userId)
    .single()

  if (error || !data) {
    return null
  }

  return data
}

/**
 * Get extended profile data from previous onboarding submissions
 */
export async function getExtendedProfileData(userId: string): Promise<ExtendedProfileData | null> {
  const supabase = createClient()
    try {
    // Get the most recent onboarding submission for this user
    const { data, error } = await supabase
      .from('onboarding_consent')
      .select('form_data')
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false })
      .limit(1)

    if (error) {
      console.warn('Could not fetch extended profile data from consent table:', error.message)
      return null
    }

    // Check if we got any data and if the first record has form_data
    if (!data || data.length === 0 || !data[0]?.form_data) {
      return null
    }

    return data[0].form_data as ExtendedProfileData
  } catch (error) {
    console.warn('Error fetching extended profile data:', error)
    return null
  }
}

/**
 * Merge profile data with new data, preferring existing values
 */
export function mergeProfileData(
  existingData: ProfileData | null,
  extendedData: ExtendedProfileData | null,
  newData: Partial<ExtendedProfileData>
): ExtendedProfileData {
  return {
    // Base profile data (from users table)
    company_name: newData.company_name || existingData?.company_name || '',
    contact_name: newData.contact_name || existingData?.contact_name || '',
    contact_email: newData.contact_email || existingData?.contact_email || '',
    tax_id: newData.tax_id || existingData?.tax_id || '',
    business_type: newData.business_type || existingData?.business_type || '',
    address_line1: newData.address_line1 || existingData?.address_line1 || '',
    address_line2: newData.address_line2 || existingData?.address_line2 || '',
    city: newData.city || existingData?.city || '',
    state: newData.state || existingData?.state || '',
    postal_code: newData.postal_code || existingData?.postal_code || '',
    country: newData.country || existingData?.country || 'United States',
    
    // Extended profile data (from previous submissions)
    contact_phone: newData.contact_phone || extendedData?.contact_phone || '',
    tax_classification: newData.tax_classification || extendedData?.tax_classification || '',
    tax_exemption: newData.tax_exemption || extendedData?.tax_exemption || '',
    bank_name: newData.bank_name || extendedData?.bank_name || '',
    account_type: newData.account_type || extendedData?.account_type || '',
    routing_number: newData.routing_number || extendedData?.routing_number || '',
    insurance_provider: newData.insurance_provider || extendedData?.insurance_provider || '',
    policy_number: newData.policy_number || extendedData?.policy_number || '',
    coverage_amount: newData.coverage_amount || extendedData?.coverage_amount || '',
    certifications: newData.certifications || extendedData?.certifications || '',
    licenses: newData.licenses || extendedData?.licenses || '',
  }
}

/**
 * Check if user has previous onboarding data
 */
export async function hasExistingProfileData(userId: string): Promise<boolean> {
  const profileData = await getUserProfileData(userId)
  const extendedData = await getExtendedProfileData(userId)
  
  // Check if user has basic profile info
  const hasBasicInfo = profileData && (
    profileData.company_name ||
    profileData.contact_name ||
    profileData.address_line1
  )
  
  // Check if user has extended info from previous submissions
  const hasExtendedInfo = extendedData && Object.keys(extendedData).length > 0
  
  return Boolean(hasBasicInfo || hasExtendedInfo)
}
