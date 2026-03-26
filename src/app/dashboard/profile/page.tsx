'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CompanyProfileSchema, type CompanyProfile } from '@/lib/validations'
import { US_STATES, US_STATE_VALUES } from '@/lib/us-states'
import { User, Building2, MapPin, Landmark, Shield, Edit3, Phone, Globe, Mail } from 'lucide-react'

/** Helper: first letter of each word, up to 2 chars */
function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

/** Helper: display a field value or a fallback */
function val(v: string | null | undefined) {
  return v || <span className="text-muted-foreground/50 italic">Not provided</span>
}

export default function ProfilePage() {
  const { user, company, updateCompany, loading } = useAuth()
  const [isEditing, setIsEditing] = useState(false)

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
      setIsEditing(false)
    },
    onError: () => {
      toast.error('Failed to update profile')
    },
  })

  if (loading || !company) {
    return (
      <div className="container mx-auto py-10 max-w-4xl px-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 max-w-4xl px-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Profile</h1>
        <Button variant={isEditing ? 'outline' : 'default'} onClick={() => setIsEditing(!isEditing)}>
          <Edit3 className="h-4 w-4 mr-2" />
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </Button>
      </div>

      {/* Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-lg">
                {company.contact_name ? getInitials(company.contact_name) : 'UN'}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">{company.contact_name || 'Unknown User'}</h2>
              <p className="text-muted-foreground">{company.legal_name || 'No company'}</p>
              <div className="flex gap-2">
                <Badge variant="secondary">
                  <User className="h-3 w-3 mr-1" />
                  Since {user?.created_at ? new Date(user.created_at).getFullYear() : '—'}
                </Badge>
                <Badge variant="outline"><Shield className="h-3 w-3 mr-1" />Verified</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!isEditing && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Business */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4" />Business</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div><p className="font-medium text-muted-foreground">Legal Name</p><p>{val(company.legal_name)}</p></div>
              <div><p className="font-medium text-muted-foreground">DBA / Trade Name</p><p>{val(company.dba_name)}</p></div>
              <div><p className="font-medium text-muted-foreground">EIN / Tax ID</p><p>{val(company.ein)}</p></div>
              <div><p className="font-medium text-muted-foreground">Business Type</p><p>{val(company.business_type)}</p></div>
              <div><p className="font-medium text-muted-foreground">Year Founded</p><p>{val(company.year_founded)}</p></div>
              <div className="flex items-center gap-1"><Globe className="h-3 w-3 text-muted-foreground" /><p>{val(company.website)}</p></div>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4" />Contact</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div><p className="font-medium text-muted-foreground">Name</p><p>{val(company.contact_name)}</p></div>
              <div className="flex items-center gap-1"><Mail className="h-3 w-3 text-muted-foreground" /><p>{user?.email}</p></div>
              <div className="flex items-center gap-1"><Mail className="h-3 w-3 text-muted-foreground" /><p>{val(company.contact_email)}</p></div>
              <div className="flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground" /><p>{val(company.contact_phone)}</p></div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MapPin className="h-4 w-4" />Address</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div><p className="font-medium text-muted-foreground">Street</p><p>{val(company.address_line1)}{company.address_line2 && `, ${company.address_line2}`}</p></div>
              <div><p className="font-medium text-muted-foreground">City / State / ZIP</p><p>{[company.city, company.state, company.postal_code].filter(Boolean).join(', ') || <span className="text-muted-foreground/50 italic">Not provided</span>}</p></div>
              <div><p className="font-medium text-muted-foreground">Country</p><p>{val(company.country)}</p></div>
            </CardContent>
          </Card>

          {/* Banking */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Landmark className="h-4 w-4" />Banking</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div><p className="font-medium text-muted-foreground">Bank Name</p><p>{val(company.bank_name)}</p></div>
              <div><p className="font-medium text-muted-foreground">Account Number</p><p>{company.bank_account_number ? '••••••••' : <span className="text-muted-foreground/50 italic">Not provided</span>}</p></div>
              <div><p className="font-medium text-muted-foreground">Routing Number</p><p>{val(company.bank_routing_number)}</p></div>
            </CardContent>
          </Card>
        </div>
      )}

      {isEditing && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(v => mutation.mutate(v))} className="space-y-6">

            {/* Business */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4" />Business Information</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="legal_name" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Legal Business Name *</FormLabel>
                    <FormControl><Input placeholder="Acme Corporation" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="dba_name" render={({ field }) => (
                  <FormItem><FormLabel>DBA / Trade Name</FormLabel><FormControl><Input placeholder="Acme" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="ein" render={({ field }) => (
                  <FormItem><FormLabel>EIN / Tax ID</FormLabel><FormControl><Input placeholder="XX-XXXXXXX" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="business_type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="LLC">LLC</SelectItem>
                        <SelectItem value="Corporation">Corporation</SelectItem>
                        <SelectItem value="Sole Proprietorship">Sole Proprietorship</SelectItem>
                        <SelectItem value="Partnership">Partnership</SelectItem>
                        <SelectItem value="Non Profit">Non Profit</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="year_founded" render={({ field }) => (
                  <FormItem><FormLabel>Year Founded</FormLabel><FormControl><Input placeholder="2010" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="website" render={({ field }) => (
                  <FormItem className="md:col-span-2"><FormLabel>Website</FormLabel><FormControl><Input placeholder="https://acme.com" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4" />Primary Contact</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="contact_name" render={({ field }) => (
                  <FormItem><FormLabel>Contact Name</FormLabel><FormControl><Input placeholder="Jane Smith" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="contact_email" render={({ field }) => (
                  <FormItem><FormLabel>Contact Email</FormLabel><FormControl><Input type="email" placeholder="jane@acme.com" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="contact_phone" render={({ field }) => (
                  <FormItem><FormLabel>Contact Phone</FormLabel><FormControl><Input placeholder="(555) 000-0000" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </CardContent>
            </Card>

            {/* Address */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MapPin className="h-4 w-4" />Business Address</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="address_line1" render={({ field }) => (
                  <FormItem className="md:col-span-2"><FormLabel>Street Address</FormLabel><FormControl><Input placeholder="123 Main Street" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="address_line2" render={({ field }) => (
                  <FormItem className="md:col-span-2"><FormLabel>Suite / Unit</FormLabel><FormControl><Input placeholder="Suite 100" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem><FormLabel>City</FormLabel><FormControl><Input placeholder="New York" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="state" render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {!US_STATE_VALUES.has(field.value ?? '') && field.value
                          ? <SelectItem value={field.value}>{field.value}</SelectItem>
                          : null}
                        {US_STATES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="postal_code" render={({ field }) => (
                  <FormItem><FormLabel>ZIP Code</FormLabel><FormControl><Input placeholder="10001" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="country" render={({ field }) => (
                  <FormItem><FormLabel>Country</FormLabel><FormControl><Input placeholder="United States" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </CardContent>
            </Card>

            {/* Banking */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Landmark className="h-4 w-4" />Banking Information</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="bank_name" render={({ field }) => (
                  <FormItem className="md:col-span-2"><FormLabel>Bank Name</FormLabel><FormControl><Input placeholder="First National Bank" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="bank_account_number" render={({ field }) => (
                  <FormItem><FormLabel>Account Number</FormLabel><FormControl><Input placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="bank_routing_number" render={({ field }) => (
                  <FormItem><FormLabel>Routing Number</FormLabel><FormControl><Input placeholder="021000021" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button type="submit" disabled={mutation.isPending || !form.formState.isDirty}>
                {mutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  )
}
