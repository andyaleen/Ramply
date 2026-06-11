'use client'

import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CompanyProfileSchema, type CompanyProfile } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CompanyFieldInput } from '@/components/company/CompanyFieldInput'
import { AddressProfileFields } from '@/components/address/AddressProfileFields'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { toast } from 'sonner'

/**
 * Profile settings tab — edits company profile data via AuthContext.updateCompany.
 * Uses the same CompanyProfileSchema and data source as the Profile page.
 */
export function ProfileSettingsTab() {
  const { user, company, updateCompany } = useAuth()

  const form = useForm<CompanyProfile>({
    resolver: zodResolver(CompanyProfileSchema),
    values: {
      legal_name: company?.legal_name ?? '',
      dba_name: company?.dba_name ?? '',
      ein: company?.ein ?? '',
      business_type: company?.business_type ?? '',
      year_founded: company?.year_founded ?? '',
      website: company?.website ?? '',
      contact_name: company?.contact_name ?? '',
      contact_email: company?.contact_email ?? '',
      contact_phone: company?.contact_phone ?? '',
      address_line1: company?.address_line1 ?? '',
      address_line2: company?.address_line2 ?? '',
      city: company?.city ?? '',
      state: company?.state ?? '',
      postal_code: company?.postal_code ?? '',
      country: company?.country ?? 'United States',
      bank_name: company?.bank_name ?? '',
      bank_account_number: company?.bank_account_number ?? '',
      bank_routing_number: company?.bank_routing_number ?? '',
    },
  })

  const mutation = useMutation({
    mutationFn: async (values: CompanyProfile) => {
      if (!user) throw new Error('No user found')
      await updateCompany(values)
    },
    onSuccess: () => {
      toast.success('Profile updated successfully')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile')
    },
  })

  const onSubmit = form.handleSubmit(
    (values) => mutation.mutate(values),
    () => toast.error('Please fix the highlighted errors before saving.'),
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>
          Manage your company profile. These details are reused across share requests.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="contact_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Name</FormLabel>
                  <FormControl><Input placeholder="Your name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="contact_email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Email</FormLabel>
                  <FormControl><Input placeholder="contact@example.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="contact_phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl><Input placeholder="Phone number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="legal_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Legal Business Name *</FormLabel>
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
              <FormField control={form.control} name="business_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Type</FormLabel>
                  <CompanyFieldInput
                    fieldKey="business_type"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                  />
                  <FormMessage />
                </FormItem>
              )} />
              <div className="md:col-span-2">
                <AddressProfileFields form={form} />
              </div>
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                disabled={mutation.isPending || !form.formState.isDirty}
              >
                {mutation.isPending ? 'Saving...' : 'Save changes'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
