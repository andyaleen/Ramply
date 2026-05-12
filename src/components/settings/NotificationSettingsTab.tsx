'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { NotificationPreferences } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { toast } from 'sonner'

const notificationSchema = z.object({
  email_notifications: z.boolean(),
  request_updates: z.boolean(),
  vendor_completions: z.boolean(),
  system_updates: z.boolean(),
})

type NotificationFormValues = z.infer<typeof notificationSchema>

const DEFAULTS: NotificationFormValues = {
  email_notifications: true,
  request_updates: true,
  vendor_completions: true,
  system_updates: false,
}

/**
 * Notification settings tab — reads/writes notification_preferences on the users table.
 */
export function NotificationSettingsTab() {
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()

  const { data: prefs } = useQuery<NotificationPreferences>({
    queryKey: ['notification-prefs', user?.id],
    queryFn: async () => {
      if (!user) return DEFAULTS
      const { data, error } = await supabase
        .from('users')
        .select('notification_preferences')
        .eq('id', user.id)
        .single()
      if (error) throw error
      return (data.notification_preferences as NotificationPreferences) ?? DEFAULTS
    },
    enabled: !!user,
  })

  const form = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationSchema),
    values: {
      email_notifications: prefs?.email_notifications ?? DEFAULTS.email_notifications,
      request_updates: prefs?.request_updates ?? DEFAULTS.request_updates,
      vendor_completions: prefs?.vendor_completions ?? DEFAULTS.vendor_completions,
      system_updates: prefs?.system_updates ?? DEFAULTS.system_updates,
    },
  })

  const mutation = useMutation({
    mutationFn: async (values: NotificationFormValues) => {
      if (!user) throw new Error('No user found')
      const { error } = await supabase
        .from('users')
        .update({
          notification_preferences: values,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Notification preferences updated')
      queryClient.invalidateQueries({ queryKey: ['notification-prefs', user?.id] })
      form.reset(form.getValues())
    },
    onError: () => {
      toast.error('Failed to update notification preferences')
    },
  })

  const ITEMS: Array<{
    name: keyof NotificationFormValues
    label: string
    description: string
  }> = [
    { name: 'email_notifications', label: 'Email Notifications', description: 'Receive notifications via email' },
    { name: 'request_updates', label: 'Request Updates', description: 'Get notified when onboarding requests change status' },
    { name: 'vendor_completions', label: 'Vendor Completions', description: 'Get notified when vendors complete onboarding' },
    { name: 'system_updates', label: 'System Updates', description: 'Receive updates about new features and improvements' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>Configure how and when you receive notifications.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-6">
            <div className="space-y-4">
              {ITEMS.map((item, i) => (
                <div key={item.name}>
                  {i > 0 && <Separator className="mb-4" />}
                  <FormField
                    control={form.control}
                    name={item.name}
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between p-3 border rounded-lg">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">{item.label}</FormLabel>
                          <FormDescription>{item.description}</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </div>
            <div className="pt-4">
              <Button
                type="submit"
                disabled={mutation.isPending || !form.formState.isDirty}
              >
                {mutation.isPending ? 'Saving...' : 'Save preferences'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
