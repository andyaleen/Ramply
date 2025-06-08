'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { DocumentUpload } from './DocumentUpload'
import { ProfileDataReuse } from './ProfileDataReuse'
import { FIELD_TYPES, DOCUMENT_TYPES } from '@/lib/validations'
import { ExtendedProfileData } from '@/lib/profile-utils'
import { Building2, User, CreditCard, Building, Shield, Award, Upload, Check } from 'lucide-react'

// Helper function to safely extract error messages
const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error
  if (error && typeof error.message === 'string') return error.message
  return ''
}

interface OnboardingFormProps {
  request: any // TODO: Add proper type
  onComplete: () => void
  isCompleting: boolean
}

// Dynamic form schema based on required fields
const createDynamicSchema = (requiredFields: string[]) => {
  const schemaFields: Record<string, z.ZodTypeAny> = {}
  
  if (requiredFields.includes('Company Information')) {
    schemaFields.company_name = z.string().min(1, 'Company name is required')
    schemaFields.business_type = z.string().min(1, 'Business type is required')
    schemaFields.tax_id = z.string().min(1, 'Tax ID is required')
  }
  
  if (requiredFields.includes('Contact Details')) {
    schemaFields.contact_name = z.string().min(1, 'Contact name is required')
    schemaFields.contact_email = z.string().email('Valid email is required')
    schemaFields.contact_phone = z.string().min(1, 'Phone number is required')
  }
  
  if (requiredFields.includes('Tax Information')) {
    schemaFields.tax_classification = z.string().min(1, 'Tax classification is required')
    schemaFields.tax_exemption = z.string().optional()
  }
  
  if (requiredFields.includes('Banking Information')) {
    schemaFields.bank_name = z.string().min(1, 'Bank name is required')
    schemaFields.account_type = z.string().min(1, 'Account type is required')
    schemaFields.routing_number = z.string().min(9, 'Valid routing number is required')
  }
  
  if (requiredFields.includes('Insurance Information')) {
    schemaFields.insurance_provider = z.string().min(1, 'Insurance provider is required')
    schemaFields.policy_number = z.string().min(1, 'Policy number is required')
    schemaFields.coverage_amount = z.string().min(1, 'Coverage amount is required')
  }
  
  if (requiredFields.includes('Certifications')) {
    schemaFields.certifications = z.string().optional()
    schemaFields.licenses = z.string().optional()
  }
  
  // Address fields
  schemaFields.address_line1 = z.string().min(1, 'Address is required')
  schemaFields.address_line2 = z.string().optional()
  schemaFields.city = z.string().min(1, 'City is required')
  schemaFields.state = z.string().min(1, 'State is required')
  schemaFields.postal_code = z.string().min(1, 'Postal code is required')
  schemaFields.country = z.string().min(1, 'Country is required')
  
  return z.object(schemaFields)
}

const getFieldIcon = (fieldType: string) => {
  switch (fieldType) {
    case 'Company Information':
      return Building2
    case 'Contact Details':
      return User
    case 'Tax Information':
      return CreditCard
    case 'Banking Information':
      return Building
    case 'Insurance Information':
      return Shield
    case 'Certifications':
      return Award
    default:
      return Building2
  }
}

export function OnboardingForm({ request, onComplete, isCompleting }: OnboardingFormProps) {
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [uploadedDocuments, setUploadedDocuments] = useState<string[]>([])
  
  const requiredFields = request.onboarding_types?.required_fields || []
  const requiredDocuments = request.onboarding_types?.required_documents || []
  
  const formSchema = createDynamicSchema(requiredFields)
  type FormData = z.infer<typeof formSchema>
    const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  })

  const handleDataReuse = (data: ExtendedProfileData) => {
    // Reset form with existing data
    reset(data as any)
  }

  const submitMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!user) throw new Error('User not authenticated')
        // Check if all required documents are uploaded
      const missingDocuments = requiredDocuments.filter(
        (doc: string) => !uploadedDocuments.includes(doc)
      )
      
      if (missingDocuments.length > 0) {
        throw new Error(`Missing required documents: ${missingDocuments.join(', ')}`)
      }

      // Save form data to onboarding_consent table
      const { error: consentError } = await supabase
        .from('onboarding_consent')
        .insert({
          request_id: request.id,
          user_id: user.id,
          form_data: data,
          submitted_at: new Date().toISOString(),
        })

      if (consentError) throw consentError

      // Update the request status
      const { error: updateError } = await supabase
        .from('onboarding_requests')
        .update({
          status: 'completed',
          completed_by: user.id,
          completed_at: new Date().toISOString(),
        })
        .eq('id', request.id)

      if (updateError) throw updateError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-request'] })
      onComplete()
    },
  })

  const onSubmit = (data: FormData) => {
    submitMutation.mutate(data)
  }

  const onDocumentUploaded = (documentType: string) => {
    setUploadedDocuments(prev => [...prev, documentType])
  }

  const renderFieldSection = (fieldType: string) => {
    const Icon = getFieldIcon(fieldType)
    
    return (
      <Card key={fieldType} className="mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Icon className="h-5 w-5" />
            {fieldType}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {fieldType === 'Company Information' && (
            <>
              <div>
                <Label htmlFor="company_name">Company Name *</Label>
                <Input
                  id="company_name"
                  {...register('company_name')}
                  className="mt-1"
                />                {errors.company_name && (
                  <p className="text-sm text-red-600 mt-1">{getErrorMessage(errors.company_name)}</p>
                )}
              </div>
              <div>
                <Label htmlFor="business_type">Business Type *</Label>
                <Input
                  id="business_type"
                  {...register('business_type')}
                  placeholder="LLC, Corporation, Partnership, etc."
                  className="mt-1"
                />                {errors.business_type && (
                  <p className="text-sm text-red-600 mt-1">{getErrorMessage(errors.business_type)}</p>
                )}
              </div>
              <div>
                <Label htmlFor="tax_id">Tax ID / EIN *</Label>
                <Input
                  id="tax_id"
                  {...register('tax_id')}
                  placeholder="XX-XXXXXXX"
                  className="mt-1"
                />                
                {errors.tax_id && (
                  <p className="text-sm text-red-600 mt-1">{getErrorMessage(errors.tax_id)}</p>
                )}
              </div>
            </>
          )}
          
          {fieldType === 'Contact Details' && (
            <>
              <div>
                <Label htmlFor="contact_name">Contact Name *</Label>
                <Input
                  id="contact_name"
                  {...register('contact_name')}
                  className="mt-1"
                />
                {errors.contact_name && (
                  <p className="text-sm text-red-600 mt-1">{getErrorMessage(errors.contact_name)}</p>
                )}
              </div>
              <div>
                <Label htmlFor="contact_email">Contact Email *</Label>
                <Input
                  id="contact_email"
                  type="email"
                  {...register('contact_email')}
                  className="mt-1"
                />
                {errors.contact_email && (
                  <p className="text-sm text-red-600 mt-1">{getErrorMessage(errors.contact_email)}</p>
                )}
              </div>
              <div>
                <Label htmlFor="contact_phone">Phone Number *</Label>
                <Input
                  id="contact_phone"
                  type="tel"
                  {...register('contact_phone')}
                  className="mt-1"
                />
                {errors.contact_phone && (
                  <p className="text-sm text-red-600 mt-1">{getErrorMessage(errors.contact_phone)}</p>
                )}
              </div>
            </>
          )}
          
          {fieldType === 'Tax Information' && (
            <>
              <div>
                <Label htmlFor="tax_classification">Tax Classification *</Label>
                <Input
                  id="tax_classification"
                  {...register('tax_classification')}
                  placeholder="Individual, Corporation, Partnership, etc."
                  className="mt-1"
                />
                {errors.tax_classification && (
                  <p className="text-sm text-red-600 mt-1">{getErrorMessage(errors.tax_classification)}</p>
                )}
              </div>
              <div>
                <Label htmlFor="tax_exemption">Tax Exemption (if applicable)</Label>
                <Input
                  id="tax_exemption"
                  {...register('tax_exemption')}
                  className="mt-1"
                />
              </div>
            </>
          )}
          
          {fieldType === 'Banking Information' && (
            <>
              <div>
                <Label htmlFor="bank_name">Bank Name *</Label>
                <Input
                  id="bank_name"
                  {...register('bank_name')}
                  className="mt-1"
                />
                {errors.bank_name && (
                  <p className="text-sm text-red-600 mt-1">{getErrorMessage(errors.bank_name)}</p>
                )}
              </div>
              <div>
                <Label htmlFor="account_type">Account Type *</Label>
                <Input
                  id="account_type"
                  {...register('account_type')}
                  placeholder="Checking, Savings, etc."
                  className="mt-1"
                />
                {errors.account_type && (
                  <p className="text-sm text-red-600 mt-1">{getErrorMessage(errors.account_type)}</p>
                )}
              </div>
              <div>
                <Label htmlFor="routing_number">Routing Number *</Label>
                <Input
                  id="routing_number"
                  {...register('routing_number')}
                  placeholder="9-digit routing number"
                  className="mt-1"
                />
                {errors.routing_number && (
                  <p className="text-sm text-red-600 mt-1">{getErrorMessage(errors.routing_number)}</p>
                )}
              </div>
            </>
          )}
          
          {fieldType === 'Insurance Information' && (
            <>
              <div>
                <Label htmlFor="insurance_provider">Insurance Provider *</Label>
                <Input
                  id="insurance_provider"
                  {...register('insurance_provider')}
                  className="mt-1"
                />
                {errors.insurance_provider && (
                  <p className="text-sm text-red-600 mt-1">{getErrorMessage(errors.insurance_provider)}</p>
                )}
              </div>
              <div>
                <Label htmlFor="policy_number">Policy Number *</Label>
                <Input
                  id="policy_number"
                  {...register('policy_number')}
                  className="mt-1"
                />
                {errors.policy_number && (
                  <p className="text-sm text-red-600 mt-1">{getErrorMessage(errors.policy_number)}</p>
                )}
              </div>
              <div>
                <Label htmlFor="coverage_amount">Coverage Amount *</Label>
                <Input
                  id="coverage_amount"
                  {...register('coverage_amount')}
                  placeholder="$1,000,000"
                  className="mt-1"
                />
                {errors.coverage_amount && (
                  <p className="text-sm text-red-600 mt-1">{getErrorMessage(errors.coverage_amount)}</p>
                )}
              </div>
            </>
          )}
          
          {fieldType === 'Certifications' && (
            <>
              <div>
                <Label htmlFor="certifications">Professional Certifications</Label>
                <Textarea
                  id="certifications"
                  {...register('certifications')}
                  placeholder="List any relevant professional certifications..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="licenses">Business Licenses</Label>
                <Textarea
                  id="licenses"
                  {...register('licenses')}
                  placeholder="List any business licenses..."
                  className="mt-1"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    )
  }
  return (
    <div className="space-y-6">
      {/* Profile Data Reuse */}
      <ProfileDataReuse 
        onDataSelected={handleDataReuse}
        requiredFields={requiredFields}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Required Fields Sections */}
        {requiredFields.map(renderFieldSection)}
        
        {/* Address Section (Always Required) */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building className="h-5 w-5" />
              Business Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="address_line1">Address Line 1 *</Label>
              <Input
                id="address_line1"
                {...register('address_line1')}
                className="mt-1"
              />
              {errors.address_line1 && (
                <p className="text-sm text-red-600 mt-1">{getErrorMessage(errors.address_line1)}</p>
              )}
            </div>
            <div>
              <Label htmlFor="address_line2">Address Line 2</Label>
              <Input
                id="address_line2"
                {...register('address_line2')}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  {...register('city')}
                  className="mt-1"
                />
                {errors.city && (
                  <p className="text-sm text-red-600 mt-1">{getErrorMessage(errors.city)}</p>
                )}
              </div>
              <div>
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  {...register('state')}
                  className="mt-1"
                />
                {errors.state && (
                  <p className="text-sm text-red-600 mt-1">{getErrorMessage(errors.state)}</p>
                )}
              </div>
              <div>
                <Label htmlFor="postal_code">Postal Code *</Label>
                <Input
                  id="postal_code"
                  {...register('postal_code')}
                  className="mt-1"
                />
                {errors.postal_code && (
                  <p className="text-sm text-red-600 mt-1">{getErrorMessage(errors.postal_code)}</p>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="country">Country *</Label>
              <Input
                id="country"
                {...register('country')}
                defaultValue="United States"
                className="mt-1"
              />
              {errors.country && (
                <p className="text-sm text-red-600 mt-1">{getErrorMessage(errors.country)}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Document Upload Section */}
        {requiredDocuments.length > 0 && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Upload className="h-5 w-5" />
                Required Documents
              </CardTitle>
              <CardDescription>
                Please upload the following documents to complete your onboarding.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {requiredDocuments.map((docType: string) => (
                <div key={docType} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {uploadedDocuments.includes(docType) ? (
                      <Check className="h-5 w-5 text-green-600" />
                    ) : (
                      <Upload className="h-5 w-5 text-gray-400" />
                    )}
                    <div>
                      <p className="font-medium">{docType}</p>
                      {uploadedDocuments.includes(docType) ? (
                        <Badge className="bg-green-100 text-green-800">Uploaded</Badge>
                      ) : (
                        <Badge variant="outline">Required</Badge>
                      )}
                    </div>
                  </div>
                  <DocumentUpload
                    documentType={docType}
                    requestId={request.id}
                    onUploadSuccess={() => onDocumentUploaded(docType)}
                    disabled={uploadedDocuments.includes(docType)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <div className="flex justify-end pt-6 border-t">
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting || submitMutation.isPending || isCompleting}
            className="min-w-32"
          >
            {isSubmitting || submitMutation.isPending || isCompleting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Submitting...
              </div>
            ) : (
              'Complete Onboarding'
            )}
          </Button>
        </div>

        {submitMutation.error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">
              {submitMutation.error.message || 'An error occurred while submitting the form.'}
            </p>
          </div>
        )}
      </form>
    </div>
  )
}
