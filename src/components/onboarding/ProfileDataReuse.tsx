'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  getUserProfileData, 
  getExtendedProfileData, 
  hasExistingProfileData,
  ProfileData,
  ExtendedProfileData 
} from '@/lib/profile-utils'
import { CheckCircle, RefreshCw, Building2, User } from 'lucide-react'

interface ProfileDataReuseProps {
  onDataSelected: (data: ExtendedProfileData) => void
  requiredFields: string[]
  currentFormData?: ExtendedProfileData
}

export function ProfileDataReuse({ onDataSelected, requiredFields, currentFormData }: ProfileDataReuseProps) {
  const { user } = useAuth()
  const [hasExisting, setHasExisting] = useState(false)
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [extendedData, setExtendedData] = useState<ExtendedProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPreview, setShowPreview] = useState(false)
  const [selectiveMode, setSelectiveMode] = useState(false)
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const checkExistingData = async () => {
      if (!user) return
      
      setLoading(true)
      try {
        const [hasData, profile, extended] = await Promise.all([
          hasExistingProfileData(user.id),
          getUserProfileData(user.id),
          getExtendedProfileData(user.id)
        ])
        
        setHasExisting(hasData)
        setProfileData(profile)
        setExtendedData(extended)
      } catch (error) {
        console.error('Error checking existing profile data:', error)
      } finally {
        setLoading(false)
      }
    }

    checkExistingData()
  }, [user])

  const handleUseExistingData = () => {
    if (!profileData && !extendedData) return
    
    // Merge the data
    const mergedData: ExtendedProfileData = {
      // Basic profile data
      company_name: profileData?.company_name || '',
      contact_name: profileData?.contact_name || '',
      contact_email: profileData?.contact_email || '',
      tax_id: profileData?.tax_id || '',
      business_type: profileData?.business_type || '',
      address_line1: profileData?.address_line1 || '',
      address_line2: profileData?.address_line2 || '',
      city: profileData?.city || '',
      state: profileData?.state || '',
      postal_code: profileData?.postal_code || '',
      country: profileData?.country || 'United States',
      
      // Extended data from previous submissions
      contact_phone: extendedData?.contact_phone || '',
      tax_classification: extendedData?.tax_classification || '',
      tax_exemption: extendedData?.tax_exemption || '',
      bank_name: extendedData?.bank_name || '',
      account_type: extendedData?.account_type || '',
      routing_number: extendedData?.routing_number || '',
      insurance_provider: extendedData?.insurance_provider || '',
      policy_number: extendedData?.policy_number || '',
      coverage_amount: extendedData?.coverage_amount || '',
      certifications: extendedData?.certifications || '',
      licenses: extendedData?.licenses || '',
    }
    
    onDataSelected(mergedData)
  }

  const getAvailableFields = () => {
    const available: string[] = []
    
    if (profileData?.company_name) available.push('Company Information')
    if (profileData?.contact_name || profileData?.contact_email) available.push('Contact Details')
    if (profileData?.tax_id || extendedData?.tax_classification) available.push('Tax Information')
    if (extendedData?.bank_name) available.push('Banking Information')
    if (extendedData?.insurance_provider) available.push('Insurance Information')
    if (extendedData?.certifications || extendedData?.licenses) available.push('Certifications')
    
    return available
  }

  const getMatchingFields = () => {
    const available = getAvailableFields()
    return requiredFields.filter(field => available.includes(field))
  }

  const getFieldComparison = () => {
    if (!profileData && !extendedData) return {}
    
    const mergedExisting: ExtendedProfileData = {
      company_name: profileData?.company_name || '',
      contact_name: profileData?.contact_name || '',
      contact_email: profileData?.contact_email || '',
      tax_id: profileData?.tax_id || '',
      business_type: profileData?.business_type || '',
      address_line1: profileData?.address_line1 || '',
      address_line2: profileData?.address_line2 || '',
      city: profileData?.city || '',
      state: profileData?.state || '',
      postal_code: profileData?.postal_code || '',
      country: profileData?.country || 'United States',
      contact_phone: extendedData?.contact_phone || '',
      tax_classification: extendedData?.tax_classification || '',
      tax_exemption: extendedData?.tax_exemption || '',
      bank_name: extendedData?.bank_name || '',
      account_type: extendedData?.account_type || '',
      routing_number: extendedData?.routing_number || '',
      insurance_provider: extendedData?.insurance_provider || '',
      policy_number: extendedData?.policy_number || '',
      coverage_amount: extendedData?.coverage_amount || '',
      certifications: extendedData?.certifications || '',
      licenses: extendedData?.licenses || '',
    }

    const comparison: Record<string, { existing: string, current: string, hasData: boolean }> = {}
    
    Object.keys(mergedExisting).forEach(key => {
      const existingValue = mergedExisting[key as keyof ExtendedProfileData] || ''
      const currentValue = currentFormData?.[key as keyof ExtendedProfileData] || ''
      
      comparison[key] = {
        existing: existingValue,
        current: currentValue,
        hasData: !!existingValue
      }
    })

    return comparison
  }

  const handleSelectiveUse = () => {
    if (!profileData && !extendedData) return
    
    const comparison = getFieldComparison()
    const selectedData: ExtendedProfileData = {}
    
    Object.keys(selectedFields).forEach(field => {
      if (selectedFields[field] && comparison[field]?.hasData) {
        selectedData[field as keyof ExtendedProfileData] = comparison[field].existing
      }
    })
    
    onDataSelected(selectedData)
  }

  const getFieldDisplayName = (fieldName: string): string => {
    const fieldMap: Record<string, string> = {
      company_name: 'Company Name',
      contact_name: 'Contact Name', 
      contact_email: 'Contact Email',
      tax_id: 'Tax ID',
      business_type: 'Business Type',
      address_line1: 'Address Line 1',
      address_line2: 'Address Line 2',
      city: 'City',
      state: 'State',
      postal_code: 'ZIP Code',
      contact_phone: 'Phone Number',
      tax_classification: 'Tax Classification',
      bank_name: 'Bank Name',
      insurance_provider: 'Insurance Provider',
      certifications: 'Certifications',
      licenses: 'Licenses'
    }
    return fieldMap[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">Checking for existing profile data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!hasExisting) {
    return null
  }

  const matchingFields = getMatchingFields()
  const availableFields = getAvailableFields()

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <RefreshCw className="h-5 w-5" />
          Reuse Previous Information
        </CardTitle>
        <CardDescription className="text-blue-700">
          We found existing profile information that can be used to prefill this form.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <span className="text-sm font-medium text-blue-800">Available data:</span>
          {availableFields.map((field) => (
            <Badge 
              key={field} 
              className={`
                ${matchingFields.includes(field) 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-blue-100 text-blue-800'
                }
              `}
            >
              {matchingFields.includes(field) && <CheckCircle className="h-3 w-3 mr-1" />}
              {field}
            </Badge>
          ))}
        </div>

        {matchingFields.length > 0 && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>{matchingFields.length}</strong> of <strong>{requiredFields.length}</strong> required 
              sections can be prefilled with your existing information.
            </p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button onClick={handleUseExistingData} size="sm">
            Use Existing Data
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? 'Hide' : 'Preview'} Data
          </Button>
          <Button 
            variant={selectiveMode ? "default" : "outline"} 
            size="sm" 
            onClick={() => setSelectiveMode(!selectiveMode)}
          >
            {selectiveMode ? 'Disable' : 'Enable'} Selective Reuse
          </Button>
        </div>

        {showPreview && (
          <div className="mt-4 p-4 bg-white border rounded-lg space-y-3">
            <h4 className="font-medium text-gray-900 mb-2">Available Information:</h4>
            
            {profileData && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Company:</span>
                  <span>{profileData.company_name || 'Not provided'}</span>
                </div>
                {profileData.contact_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Contact:</span>
                    <span>{profileData.contact_name}</span>
                  </div>
                )}
                {profileData.address_line1 && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Address:</span>
                    <span>
                      {profileData.address_line1}, {profileData.city}, {profileData.state} {profileData.postal_code}
                    </span>
                  </div>
                )}
              </div>
            )}

            {extendedData && (
              <div className="border-t pt-2 space-y-1">
                <p className="text-xs text-gray-600">Additional data from previous submissions:</p>
                {extendedData.contact_phone && (
                  <div className="text-sm">Phone: {extendedData.contact_phone}</div>
                )}
                {extendedData.bank_name && (
                  <div className="text-sm">Bank: {extendedData.bank_name}</div>
                )}
                {extendedData.insurance_provider && (
                  <div className="text-sm">Insurance: {extendedData.insurance_provider}</div>
                )}
              </div>
            )}
          </div>
        )}

        {selectiveMode && (
          <div className="mt-4 p-4 bg-white border rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Select Fields to Reuse:</h4>
            
            {Object.keys(getFieldComparison()).map((key) => {
              const field = key as keyof ExtendedProfileData
              const { existing, current, hasData } = getFieldComparison()[key]

              if (!hasData) return null
              
              return (
                <div key={key} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={selectedFields[key] || false} 
                      onChange={(e) => setSelectedFields({
                        ...selectedFields,
                        [key]: e.target.checked
                      })}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-900">{field}</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {existing !== current && (
                      <span>
                        Existing: <strong>{existing}</strong>
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
            
            <div className="flex justify-end gap-2 mt-4">
              <Button 
                onClick={handleSelectiveUse} 
                size="sm" 
                disabled={Object.keys(selectedFields).length === 0}
              >
                Use Selected Data
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSelectiveMode(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
