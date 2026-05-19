'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ProfileSettingsTab } from '@/components/settings/ProfileSettingsTab'
import { NotificationSettingsTab } from '@/components/settings/NotificationSettingsTab'
import { SecuritySettingsTab } from '@/components/settings/SecuritySettingsTab'

function SettingsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default function SettingsPage() {
  const { profileLoading } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')

  return (
    <div className="container mx-auto py-10 max-w-3xl px-6">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-8">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {profileLoading ? (
          <SettingsSkeleton />
        ) : (
          <>
            <TabsContent value="profile">
              <ProfileSettingsTab />
            </TabsContent>
            <TabsContent value="notifications">
              <NotificationSettingsTab />
            </TabsContent>
            <TabsContent value="security">
              <SecuritySettingsTab />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  )
}
