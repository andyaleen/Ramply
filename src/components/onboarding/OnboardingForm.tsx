'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { DocumentUpload } from './DocumentUpload'
import { ProfileDataReuse } from './ProfileDataReuse'
import { ExtendedProfileData } from '@/lib/profile-utils'
import { AlertTriangle, CheckCircle, Upload, RefreshCw, Clock } from 'lucide-react'

const supabase = createClient()

interface OnboardingRequest {
  id: string
  onboarding_types?: OnboardingType
  [key: string]: unknown
}

interface OnboardingFormProps {
  request: OnboardingRequest
  onComplete: () => void
  isCompleting: boolean
}

interface OnboardingType {
  id: string
  name: string
  required_documents: string[]
  required_fields: string[]
}

interface FormData {
  company_name: string
  contact_name: string
  contact_email: string
  tax_id: string
  business_type: string
  address_line1: string
  address_line2: string
  city: string
  state: string
  zip_code: string
  phone: string
  website: string
  description: string
  [key: string]: string
}

interface UploadedDocument {
  document_type: string
}

export function OnboardingForm({ request, onComplete }: OnboardingFormProps) {
  const [loading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [onboardingType, setOnboardingType] = useState<OnboardingType | null>(null)
  const [formData, setFormData] = useState<FormData>({
    company_name: '',
    contact_name: '',
    contact_email: '',
    tax_id: '',
    business_type: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    website: '',    
    description: ''
  })
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([])
  const [consents, setConsents] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [missingFieldsList, setMissingFieldsList] = useState<string[]>([])
  const [missingDocumentsList, setMissingDocumentsList] = useState<string[]>([])
  const [documentUploadProgress, setDocumentUploadProgress] = useState<Record<string, 'uploading' | 'completed' | 'error'>>({})
  const [formCompletionProgress, setFormCompletionProgress] = useState(0)

  const loadOnboardingData = useCallback(async () => {
    try {
      console.log('Loading onboarding data for request:', request?.id)
      
      // Use the request data that's already passed in
      if (request?.onboarding_types) {
        console.log('Found onboarding request:', request)
        setOnboardingType(request.onboarding_types)
      } else {
        // Fallback: Get onboarding request details from database
        const { data: requestData, error: requestError } = await supabase
          .from('onboarding_requests')
          .select(`
            *,
            onboarding_types (
              id,
              name,
              required_documents,
              required_fields
            )
          `)
          .eq('id', request?.id)
          .single()        
          if (requestError) {
          console.error('Error loading onboarding request:', requestError)
          // Use default onboarding type for testing
          console.log('Using default onboarding type for testing')
          setOnboardingType({
            id: 'default-test',
            name: 'Test Vendor Onboarding',
            required_documents: ['W9 Form', 'Certificate of Insurance', 'Bank Details'],
            required_fields: ['company_name', 'contact_name', 'contact_email', 'tax_id', 'business_type', 'address_line1', 'city', 'state', 'zip_code', 'phone']
          })
        } else if (!requestData || !requestData.onboarding_types) {
          console.log('No onboarding type found, using default for testing')
          setOnboardingType({
            id: 'default-test',
            name: 'Test Vendor Onboarding',
            required_documents: ['W9 Form', 'Certificate of Insurance', 'Bank Details'],
            required_fields: ['company_name', 'contact_name', 'contact_email', 'tax_id', 'business_type', 'address_line1', 'city', 'state', 'zip_code', 'phone']
          })
        } else {
          console.log('Found onboarding request:', requestData)
          setOnboardingType(requestData.onboarding_types)
        }
      }

      // Get user profile data to pre-populate form
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profile) {
          setFormData(prev => ({
            ...prev,
            company_name: profile.company_name || '',
            contact_name: profile.contact_name || '',
            contact_email: profile.contact_email || user.email || '',
            tax_id: profile.tax_id || '',
            business_type: profile.business_type || '',
            address_line1: profile.address_line1 || '',
            address_line2: profile.address_line2 || '',
            city: profile.city || '',
            state: profile.state || '',
            zip_code: profile.zip_code || '',
            phone: profile.phone || '',
            website: profile.website || '',
            description: profile.description || ''
          }))        }
      }
    } catch (err) {
      console.error('Error in loadOnboardingData:', err)
      setError('Failed to load onboarding data')
    }
  }, [request])
    const loadUploadedDocuments = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !request?.id) {
        console.log('Cannot load documents - missing user or request:', { 
          hasUser: !!user, 
          userId: user?.id, 
          hasRequest: !!request, 
          requestId: request?.id 
        })
        return
      }

      console.log('=== LOADING UPLOADED DOCUMENTS ===')
      console.log('Request ID:', request.id)
      console.log('User ID:', user.id)
      console.log('Request object:', request)
      
      // First, try to get all documents for this request (without user filter)
      console.log('Testing query without user filter...')
      const { data: allDocsForRequest, error: allDocsError } = await supabase
        .from('documents')
        .select('*')
        .eq('request_id', request.id)

      if (allDocsError) {
        console.error('Error getting all docs for request:', allDocsError)
      } else {
        console.log('All documents for this request:', allDocsForRequest)
      }
      
      // Now try the specific query
      console.log('Testing query with user filter...')
      const { data, error } = await supabase
        .from('documents')
        .select('document_type')
        .eq('request_id', request.id)
        .eq('user_id', user.id)

      if (error) {
        console.error('Database error loading uploaded documents:', { 
          error, 
          message: error.message, 
          details: error.details, 
          hint: error.hint, 
          code: error.code,
          request_id: request?.id,
          user_id: user.id 
        })
        
        // Try a broader query to see if RLS is the issue
        console.log('Trying broader query to test RLS...')
        const { data: broadData, error: broadError } = await supabase
          .from('documents')
          .select('document_type')
          .limit(10)
          
        if (broadError) {
          console.error('Broad query also failed:', broadError)
        } else {
          console.log('Broad query succeeded, found', broadData.length, 'documents')
        }
        
        return
      }

      console.log('Loaded uploaded documents successfully:', data)
      setUploadedDocuments(data || [])
    } catch (err) {
      console.error('Error loading uploaded documents:', err)
    }
  }, [request])

  // Load onboarding request and user data
  useEffect(() => {
    if (request?.id) {
      loadOnboardingData()
      loadUploadedDocuments()
    }
  }, [request?.id, loadOnboardingData, loadUploadedDocuments])
    const handleProfileDataReuse = (data: ExtendedProfileData) => {
    const cleanData: FormData = {
      company_name: data.company_name || '',
      contact_name: data.contact_name || '',
      contact_email: data.contact_email || '',
      tax_id: data.tax_id || '',
      business_type: data.business_type || '',
      address_line1: data.address_line1 || '',
      address_line2: data.address_line2 || '',
      city: data.city || '',
      state: data.state || '',
      zip_code: data.postal_code || '',
      phone: data.contact_phone || '',
      website: '',
      description: ''
    }
    setFormData(prev => ({ ...prev, ...cleanData }))
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleConsentChange = (consentType: string, checked: boolean) => {
    setConsents(prev => ({
      ...prev,
      [consentType]: checked
    }))
  }
  const handleDocumentUploaded = async (documentType: string) => {
    console.log('Document uploaded callback triggered for:', documentType)
    
    // Set upload progress to completed
    setDocumentUploadProgress(prev => ({
      ...prev,
      [documentType]: 'completed'
    }))
    
    // Update the uploaded documents list immediately
    setUploadedDocuments(prev => {
      const filtered = prev.filter(doc => doc.document_type !== documentType)
      const updated = [...filtered, { document_type: documentType }]
      console.log('Updated uploaded documents:', updated)
      return updated
    })
    
    // Clear any validation errors when a document is uploaded
    setError(null)
    
    // Refresh document list from database to ensure consistency
    await loadUploadedDocuments()
  }
  const validateForm = async () => {
    console.log('=== ENHANCED FORM VALIDATION ===')
    
    // Get fresh document data from database to ensure accuracy
    let currentUploadedDocs = uploadedDocuments
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && request?.id) {
        const { data, error } = await supabase
          .from('documents')
          .select('document_type')
          .eq('request_id', request.id)
          .eq('user_id', user.id)

        if (!error && data) {
          currentUploadedDocs = data
          console.log('Fresh uploaded documents from DB:', currentUploadedDocs)
          setUploadedDocuments(currentUploadedDocs)
        } else if (error) {
          console.warn('Could not verify documents from database:', error.message)
        }
      }
    } catch (err) {
      console.error('Error getting fresh document data:', err)
    }
      // Validate documents
    const requiredDocs = onboardingType?.required_documents || []
    const uploadedDocTypes = currentUploadedDocs.map(doc => doc.document_type)
    const missingDocs = requiredDocs.filter(doc => !uploadedDocTypes.includes(doc))

    console.log('📋 Document validation:')
    console.log('  Required docs:', requiredDocs)
    console.log('  Uploaded docs:', uploadedDocTypes)
    console.log('  Missing docs:', missingDocs)

    if (missingDocs.length > 0) {
      console.log('❌ Document validation failed')
      setError(`Missing required documents: ${missingDocs.join(', ')}. Please upload all required documents before submitting.`)
      return false
    }    // Validate required fields more intelligently
    const requiredFields = onboardingType?.required_fields || []    // Map required field names to actual form field names
    const mapRequiredFieldToFormField = (requiredField: string): string[] => {
      const fieldMapping: Record<string, string[]> = {
        'Tax Information': ['tax_id'],
        'Company Information': ['company_name'],
        'Contact Information': ['contact_name', 'contact_email'],
        'Address Information': ['address_line1', 'city', 'state', 'zip_code'],
        'Business Type': ['business_type'],
        'Phone': ['phone'],
        'Website': ['website'],
        'Description': ['description'],
        // Banking Information is handled via document upload, not form fields
        'Banking Information': [] // Empty array means this is satisfied by document upload only
      }
      
      // If there's a mapping, use it; otherwise assume it's a direct field name
      return fieldMapping[requiredField] || [requiredField]
    }
      // Check each required field against its mapped form fields
    const missingFields: string[] = []
    requiredFields.forEach(requiredField => {
      const formFields = mapRequiredFieldToFormField(requiredField)
      
      // If formFields is empty, this field is satisfied by document upload only
      if (formFields.length === 0) {
        return // Skip validation for document-only fields
      }
      
      const hasAllRequiredData = formFields.some(field => formData[field] && formData[field].trim() !== '')
      
      if (!hasAllRequiredData) {
        missingFields.push(requiredField)
      }
    })

    console.log('📝 Field validation:')
    console.log('  Required fields:', requiredFields)
    console.log('  Form data keys:', Object.keys(formData))
    console.log('  Missing fields:', missingFields)

    if (missingFields.length > 0) {
      console.log('❌ Field validation failed')
      const missingFieldNames = missingFields.map(field => field) // Use the display name directly
      setError(`Missing required information: ${missingFieldNames.join(', ')}. Please fill in all required fields.`)
      return false
    }// Validate consents
    const requiredConsents = ['data_processing', 'terms_of_service']
    const missingConsents = requiredConsents.filter(consent => !consents[consent])

    console.log('✅ Consent validation:')
    console.log('  Required consents:', requiredConsents)
    console.log('  Current consents:', consents)
    console.log('  Missing consents:', missingConsents)

    if (missingConsents.length > 0) {
      console.log('❌ Consent validation failed')
      setError(`Please accept all required consents before submitting.`)
      return false
    }

    console.log('✅ Form validation passed')
    return true
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('🚀 Form submission started...')
    const isValid = await validateForm()
    console.log('✅ Validation result:', isValid)
    
    if (!isValid) {
      console.log('❌ Validation failed, stopping submission')
      return
    }

    console.log('✅ Validation passed, proceeding with submission...')
    setIsSubmitting(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('You must be logged in to submit')
        return
      }      // Save consent data
      const { error: consentError } = await supabase
        .from('onboarding_consent')
        .insert({
          request_id: request?.id,
          user_id: user.id,
          form_data: {
            ...formData,
            consents: consents
          },
          submitted_at: new Date().toISOString()
        })

      if (consentError) {
        console.error('Error saving consent:', consentError)
        setError('Failed to save consent data')
        return
      }      // Update request status
      const { error: updateError } = await supabase
        .from('onboarding_requests')
        .update({ 
          status: 'completed',
          completed_by: user.id,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', request?.id)

      if (updateError) {
        console.error('Error updating request status:', updateError)
        setError('Failed to update request status')
        return
      }      // Call the completion callback instead of redirecting
      onComplete()
    } catch (err) {
      console.error('Error submitting form:', err)
      setError('Failed to submit onboarding form')
    } finally {
      setIsSubmitting(false)
    }
  }
  const handleRefreshDocuments = async () => {
    console.log('Refreshing document list...')
    await loadUploadedDocuments()
  }
  // Helper function to get field display name
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
      zip_code: 'ZIP Code',
      phone: 'Phone Number',
      website: 'Website',
      description: 'Description'
    }
    return fieldMap[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }
  // Run analysis when the actual data changes, not when the functions change
  useEffect(() => {
    if (!onboardingType) return

    // Analyze missing fields
    const requiredFields = onboardingType.required_fields || []
    const missing: string[] = []
    const available: string[] = []

    requiredFields.forEach(field => {
      if (formData[field] && formData[field].trim() !== '') {
        available.push(field)
      } else {
        missing.push(field)
      }
    })

    setMissingFieldsList(missing)
    
    // Calculate form completion progress
    const totalFields = requiredFields.length
    const completedFields = available.length
    const fieldsProgress = totalFields > 0 ? (completedFields / totalFields) * 50 : 0

    // Document progress
    const requiredDocs = onboardingType.required_documents || []
    const uploadedDocTypes = uploadedDocuments.map(doc => doc.document_type)
    const completedDocs = requiredDocs.filter(doc => uploadedDocTypes.includes(doc)).length
    const docsProgress = requiredDocs.length > 0 ? (completedDocs / requiredDocs.length) * 50 : 0

    setFormCompletionProgress(Math.round(fieldsProgress + docsProgress))

    // Analyze missing documents
    const missingDocs = requiredDocs.filter(doc => !uploadedDocTypes.includes(doc))
    setMissingDocumentsList(missingDocs)

  }, [onboardingType, formData, uploadedDocuments])

  if (!onboardingType) {
    return <div>Loading...</div>
  }  const requiredDocuments = onboardingType.required_documents || []
  const uploadedDocTypes = uploadedDocuments.map(doc => doc.document_type)
  const missingDocuments = requiredDocuments.filter(doc => !uploadedDocTypes.includes(doc))
  
  // Only log debug info when there are issues or during initial load
  const shouldDebug = process.env.NODE_ENV === 'development' && (missingDocuments.length > 0 || uploadedDocuments.length !== requiredDocuments.length)
  if (shouldDebug) {
    console.log('=== DOCUMENT STATUS DEBUG ===')
    console.log('Request ID:', request?.id)
    console.log('Required Documents:', requiredDocuments)
    console.log('Uploaded Documents:', uploadedDocuments)
    console.log('Missing Documents:', missingDocuments)
  }

  console.log("consents ",consents)

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>        <CardHeader>
          <CardTitle>{onboardingType.name}</CardTitle>
          <CardDescription>
            Please complete all required information and upload necessary documents.
          </CardDescription>
          
          {/* Progress Indicator */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Completion Progress</span>
              <span className="text-sm font-medium text-blue-600">{formCompletionProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${formCompletionProgress}%` }}
              ></div>
            </div>
          </div>

          {/* Missing Items Summary */}
          {(missingFieldsList.length > 0 || missingDocumentsList.length > 0) && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">Still needed to complete:</span>
              </div>
              
              {missingFieldsList.length > 0 && (
                <div className="mb-2">
                  <span className="text-xs text-amber-700 font-medium">Information: </span>
                  <span className="text-xs text-amber-700">
                    {missingFieldsList.map(field => getFieldDisplayName(field)).join(', ')}
                  </span>
                </div>
              )}
              
              {missingDocumentsList.length > 0 && (
                <div>
                  <span className="text-xs text-amber-700 font-medium">Documents: </span>
                  <span className="text-xs text-amber-700">
                    {missingDocumentsList.join(', ')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Completion Status */}
          {formCompletionProgress === 100 && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Ready to submit!</span>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">            {error && (
              <div className="border border-red-200 bg-red-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                  <span className="text-red-700">{error}</span>
                </div>
              </div>
            )}            {/* Profile Data Reuse */}            
            <ProfileDataReuse 
              onDataSelected={handleProfileDataReuse}
              requiredFields={onboardingType?.required_fields || []}
              currentFormData={formData}
            />

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company_name">Company Name *</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => handleInputChange('company_name', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="contact_name">Contact Name *</Label>
                <Input
                  id="contact_name"
                  value={formData.contact_name}
                  onChange={(e) => handleInputChange('contact_name', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="contact_email">Contact Email *</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => handleInputChange('contact_email', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="tax_id">Tax ID</Label>
                <Input
                  id="tax_id"
                  value={formData.tax_id}
                  onChange={(e) => handleInputChange('tax_id', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="business_type">Business Type</Label>
                <Select 
                  value={formData.business_type}
                  onValueChange={(value) => handleInputChange('business_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select business type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corporation">Corporation</SelectItem>
                    <SelectItem value="llc">LLC</SelectItem>
                    <SelectItem value="partnership">Partnership</SelectItem>
                    <SelectItem value="sole_proprietorship">Sole Proprietorship</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Address Fields */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Address Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="address_line1">Address Line 1</Label>
                  <Input
                    id="address_line1"
                    value={formData.address_line1}
                    onChange={(e) => handleInputChange('address_line1', e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="address_line2">Address Line 2</Label>
                  <Input
                    id="address_line2"
                    value={formData.address_line2}
                    onChange={(e) => handleInputChange('address_line2', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="zip_code">ZIP Code</Label>
                  <Input
                    id="zip_code"
                    value={formData.zip_code}
                    onChange={(e) => handleInputChange('zip_code', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="description">Business Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                />
              </div>
            </div>

            {/* Document Upload Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Required Documents</h3>
                <Button 
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshDocuments}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              
              {requiredDocuments.map((documentType) => {
                const isUploaded = uploadedDocTypes.includes(documentType)
                return (
                  <div key={documentType} className="border rounded-lg p-4">                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {documentUploadProgress[documentType] === 'uploading' ? (
                          <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
                        ) : documentUploadProgress[documentType] === 'error' ? (
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                        ) : isUploaded ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <Upload className="h-5 w-5 text-gray-400" />
                        )}
                        <span className="font-medium">{documentType}</span>
                        {documentUploadProgress[documentType] === 'uploading' && (
                          <span className="text-sm text-blue-600">(Uploading...)</span>
                        )}
                        {documentUploadProgress[documentType] === 'error' && (
                          <span className="text-sm text-red-600">(Upload failed)</span>
                        )}
                        {isUploaded && (
                          <span className="text-sm text-green-600">(Uploaded)</span>
                        )}
                      </div>
                    </div><DocumentUpload
                      requestId={request?.id}
                      documentType={documentType}
                      onUploadSuccess={() => handleDocumentUploaded(documentType)}
                      onUploadStart={(docType) => setDocumentUploadProgress(prev => ({ ...prev, [docType]: 'uploading' }))}
                      onUploadError={(docType, error) => {
                        setDocumentUploadProgress(prev => ({ ...prev, [docType]: 'error' }))
                        setError(`Failed to upload ${docType}: ${error}`)
                      }}
                      isUploaded={isUploaded}
                      disabled={isUploaded}
                    />
                  </div>
                )
              })}              {missingDocuments.length > 0 && (
                <div className="border border-yellow-200 bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2" />
                    <span className="text-yellow-700">
                      Missing required documents: {missingDocuments.join(', ')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Consent Checkboxes */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Consents & Agreements</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="data_processing"
                    checked={consents.data_processing || false}
                    onCheckedChange={(checked) => 
                      handleConsentChange('data_processing', checked as boolean)
                    }
                  />
                  <Label htmlFor="data_processing" className="text-sm leading-5">
                    I consent to the processing of my personal data for onboarding purposes
                  </Label>
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms_of_service"
                    checked={consents.terms_of_service || false}
                    onCheckedChange={(checked) => 
                      handleConsentChange('terms_of_service', checked as boolean)
                    }
                  />
                  <Label htmlFor="terms_of_service" className="text-sm leading-5">
                    I agree to the terms of service and privacy policy
                  </Label>
                </div>
              </div>            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={isSubmitting || missingDocuments.length > 0 || consents.data_processing === false || consents.terms_of_service === false}
                className="min-w-32"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Onboarding'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
