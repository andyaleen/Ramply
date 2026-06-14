'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CompanyProfileSchema, type CompanyProfile } from '@/lib/validations'
import { CompanyFieldInput } from '@/components/company/CompanyFieldInput'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Building2, MapPin, User, Landmark } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { AddressProfileFields } from '@/components/address/AddressProfileFields'
import { CompanyLogoUpload } from '@/components/profile/CompanyLogoUpload'

interface ProfileSetupProps {
  onComplete: () => void
  /** When set, replaces the default profile setup headline. */
  inviteHeadline?: string
}

/** Marks a profile field as required in the setup form. */
function RequiredAsterisk() {
  return <span className="text-red-600" aria-hidden="true"> *</span>
}

/** Wraps a field label with a red required asterisk. */
function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <FormLabel>
      {children}
      <RequiredAsterisk />
    </FormLabel>
  )
}

/** Highlights invalid fields after a failed submit attempt. */
function invalidFieldClass(hasError: boolean) {
  return hasError
    ? 'rounded-md border border-red-300 bg-red-50/70 p-3 -m-1'
    : undefined
}

export function ProfileSetup({ onComplete, inviteHeadline }: ProfileSetupProps) {
  const [loading, setLoading] = useState(false)
  const { company, updateCompany } = useAuth()

  const form = useForm<CompanyProfile>({
    resolver: zodResolver(CompanyProfileSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      legal_name: company?.legal_name ?? '',
      dba_name: company?.dba_name ?? '',
      ein: company?.ein ?? '',
      business_type: company?.business_type ?? '',
      address_line1: company?.address_line1 ?? '',
      address_line2: company?.address_line2 ?? '',
      city: company?.city ?? '',
      state: company?.state ?? '',
      postal_code: company?.postal_code ?? '',
      country: company?.country ?? 'United States',
      contact_name: company?.contact_name ?? '',
      contact_email: company?.contact_email ?? '',
      contact_phone: company?.contact_phone ?? '',
      bank_name: company?.bank_name ?? '',
      bank_account_number: company?.bank_account_number ?? '',
      bank_routing_number: company?.bank_routing_number ?? '',
      website: company?.website ?? '',
      year_founded: company?.year_founded ?? '',
    },
  })

  /** Saves the company profile before releasing the user into the app. */
  const saveProfile = async (data: CompanyProfile) => {
    setLoading(true)
    try {
      await updateCompany(data)
      onComplete()
    } catch (error) {
      console.error('Error saving company profile:', error)
      toast.error('Failed to save profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = form.handleSubmit(
    saveProfile,
    (errors) => {
      toast.error('Please fill in the required fields highlighted below.')
      const firstInvalidField = Object.keys(errors)[0] as keyof CompanyProfile | undefined
      if (firstInvalidField) {
        form.setFocus(firstInvalidField)
      }
    }
  )

  return (
    <div className="min-h-screen bg-[#F0EFE9] px-4 py-10 text-[#0F1F18]">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-[#287253] p-4 rounded-full shadow-[0_14px_35px_rgba(40,114,83,0.22)]">
              <Building2 className="h-8 w-8 text-white" aria-hidden />
            </div>
          </div>
          <h1 className="text-3xl font-semibold text-[#0F1F18]">
            {inviteHeadline ?? 'Complete Your Company Profile'}
          </h1>
          <p className="text-[#4A5C54] mt-2">
            {inviteHeadline
              ? 'Create your company profile to start sharing onboarding information securely.'
              : 'Fill in your company details once — they&apos;ll be reused automatically for every share request.'}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-6 [&_input]:border-[#DDDCD5] [&_input]:focus-visible:ring-[#287253]/30">
            <Card className="border-[#DDDCD5] bg-white shadow-[0_18px_45px_rgba(15,31,24,0.06)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-[#0F1F18]">
                  <Building2 className="h-4 w-4" /> Business Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <CompanyLogoUpload variant="compact" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="legal_name" render={({ field, fieldState }) => (
                  <FormItem className={cn('md:col-span-2', invalidFieldClass(!!fieldState.error))}>
                    <RequiredLabel>Legal Business Name</RequiredLabel>
                    <FormControl><Input placeholder="Acme Corporation" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="dba_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>DBA / Trade Name</FormLabel>
                    <FormControl><Input placeholder="Acme" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="ein" render={({ field, fieldState }) => (
                  <FormItem className={invalidFieldClass(!!fieldState.error)}>
                    <RequiredLabel>EIN / Tax ID</RequiredLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="off"
                        placeholder="XX-XXXXXXX"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="business_type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Type</FormLabel>
                    <CompanyFieldInput
                      fieldKey="business_type"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      selectTriggerClassName="border-[#DDDCD5] focus:ring-[#287253]/30"
                    />
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="year_founded" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year Founded</FormLabel>
                    <FormControl><Input placeholder="2010" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="website" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Website</FormLabel>
                    <FormControl><Input placeholder="https://acme.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#DDDCD5] bg-white shadow-[0_18px_45px_rgba(15,31,24,0.06)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-[#0F1F18]">
                  <User className="h-4 w-4" /> Primary Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="contact_name" render={({ field, fieldState }) => (
                  <FormItem className={invalidFieldClass(!!fieldState.error)}>
                    <RequiredLabel>Contact Name</RequiredLabel>
                    <FormControl><Input placeholder="Jane Smith" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="contact_email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl><Input type="email" placeholder="jane@acme.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="contact_phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Phone</FormLabel>
                    <FormControl><Input placeholder="(555) 000-0000" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            <Card className="border-[#DDDCD5] bg-white shadow-[0_18px_45px_rgba(15,31,24,0.06)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-[#0F1F18]">
                  <MapPin className="h-4 w-4" /> Business Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <AddressProfileFields
                  form={form}
                  inputClassName="border-[#DDDCD5] focus:ring-[#287253]/30"
                />
              </CardContent>
            </Card>

            <Card className="border-[#DDDCD5] bg-white shadow-[0_18px_45px_rgba(15,31,24,0.06)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-[#0F1F18]">
                  <Landmark className="h-4 w-4" /> Banking Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="bank_name" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Bank Name</FormLabel>
                    <FormControl><Input placeholder="First National Bank" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="bank_account_number" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Number</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="off"
                        placeholder="••••••••"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="bank_routing_number" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Routing Number</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="off"
                        placeholder="021000021"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={loading} size="lg" className="bg-[#287253] text-white hover:bg-[#1A4D38]">
                {loading ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>

          </form>
        </Form>

        <p className="mt-8 text-center text-sm text-[#4A5C54] leading-relaxed">
          Your data is protected with encrypted connections (HTTPS), strict access controls, and private document storage. Sensitive fields like tax and banking info are only shared when you choose to share them.
        </p>
      </div>
    </div>
  )
}
