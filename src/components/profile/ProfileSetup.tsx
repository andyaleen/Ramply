'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserProfileSchema, type UserProfile } from '@/lib/validations'
import { Building2, User, MapPin, CreditCard } from 'lucide-react'

interface ProfileSetupProps {
  onComplete: () => void
}

export function ProfileSetup({ onComplete }: ProfileSetupProps) {
  const [loading, setLoading] = useState(false)
  const { updateProfile, userProfile } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserProfile>({
    resolver: zodResolver(UserProfileSchema),
    defaultValues: userProfile ? {
      company_name: userProfile.company_name || '',
      contact_name: userProfile.contact_name || '',
      contact_email: userProfile.contact_email || '',
      tax_id: userProfile.tax_id || '',
      business_type: userProfile.business_type || '',
      address_line1: userProfile.address_line1 || '',
      address_line2: userProfile.address_line2 || '',
      city: userProfile.city || '',
      state: userProfile.state || '',
      postal_code: userProfile.postal_code || '',
      country: userProfile.country || 'United States',
    } : {
      country: 'United States',
    },
  })

  const onSubmit = async (data: UserProfile) => {
    setLoading(true)
    try {
      await updateProfile(data)
      onComplete()
    } catch (error) {
      console.error('Error updating profile:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-600 p-4 rounded-full">
              <Building2 className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Complete Your Profile</h1>
          <p className="text-gray-600 mt-2">
            Help us understand your business better to provide the best onboarding experience
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Company Information
            </CardTitle>
            <CardDescription>
              Provide your company details for onboarding requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name *</Label>
                  <Input
                    id="company_name"
                    {...register('company_name')}
                    placeholder="Acme Corporation"
                  />
                  {errors.company_name && (
                    <p className="text-sm text-red-600">{errors.company_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_type">Business Type</Label>
                  <Input
                    id="business_type"
                    {...register('business_type')}
                    placeholder="LLC, Corporation, Partnership, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_name">Contact Name *</Label>
                  <Input
                    id="contact_name"
                    {...register('contact_name')}
                    placeholder="John Doe"
                  />
                  {errors.contact_name && (
                    <p className="text-sm text-red-600">{errors.contact_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_email">Contact Email *</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    {...register('contact_email')}
                    placeholder="john@acme.com"
                  />
                  {errors.contact_email && (
                    <p className="text-sm text-red-600">{errors.contact_email.message}</p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="tax_id">Tax ID / EIN</Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="tax_id"
                      {...register('tax_id')}
                      placeholder="12-3456789"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-medium">Business Address</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address_line1">Address Line 1 *</Label>
                    <Input
                      id="address_line1"
                      {...register('address_line1')}
                      placeholder="123 Main Street"
                    />
                    {errors.address_line1 && (
                      <p className="text-sm text-red-600">{errors.address_line1.message}</p>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address_line2">Address Line 2</Label>
                    <Input
                      id="address_line2"
                      {...register('address_line2')}
                      placeholder="Suite 100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      {...register('city')}
                      placeholder="New York"
                    />
                    {errors.city && (
                      <p className="text-sm text-red-600">{errors.city.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      {...register('state')}
                      placeholder="NY"
                    />
                    {errors.state && (
                      <p className="text-sm text-red-600">{errors.state.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postal_code">Postal Code *</Label>
                    <Input
                      id="postal_code"
                      {...register('postal_code')}
                      placeholder="10001"
                    />
                    {errors.postal_code && (
                      <p className="text-sm text-red-600">{errors.postal_code.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Country *</Label>
                    <Input
                      id="country"
                      {...register('country')}
                      placeholder="United States"
                    />
                    {errors.country && (
                      <p className="text-sm text-red-600">{errors.country.message}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-6">
                <Button type="submit" disabled={loading} size="lg">
                  {loading ? 'Saving...' : 'Complete Setup'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
