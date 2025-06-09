import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

export interface UserSettings {
  id: string
  email: string
  contact_name: string | null
  company_name: string | null
  address: string | null
  phone: string | null
  preferred_language: string | null
  notification_preferences: NotificationPreferences
  theme_preference: string | null
  timezone: string | null
  created_at: string
  updated_at: string | null
}

export interface NotificationPreferences {
  email_notifications: boolean
  request_updates: boolean
  vendor_completions: boolean
  system_updates: boolean
}

class SettingsService {
  private supabase = createClient()

  async getUserSettings(user: User): Promise<UserSettings | null> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error

      // Set default notification preferences if none exist
      if (!data.notification_preferences) {
        data.notification_preferences = {
          email_notifications: true,
          request_updates: true,
          vendor_completions: true,
          system_updates: false
        }
      }
      
      return data
    } catch (error) {
      console.error('Error fetching user settings:', error)
      return null
    }
  }

  async updateUserSettings(user: User, settings: Partial<UserSettings>): Promise<UserSettings | null> {
    try {
      // Remove id and email from update payload
      const { id, email, created_at, ...updatePayload } = settings as any
      
      const { data, error } = await this.supabase
        .from('users')
        .update(updatePayload)
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error
      
      return data
    } catch (error) {
      console.error('Error updating user settings:', error)
      return null
    }
  }

  async updateNotificationPreferences(
    user: User, 
    preferences: NotificationPreferences
  ): Promise<UserSettings | null> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .update({ 
          notification_preferences: preferences,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error
      
      return data
    } catch (error) {
      console.error('Error updating notification preferences:', error)
      return null
    }
  }
}

export const settingsService = new SettingsService()
