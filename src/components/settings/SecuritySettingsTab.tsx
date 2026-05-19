'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Security settings tab — displays account security options.
 * Email/password changes are handled by Supabase Auth.
 */
export function SecuritySettingsTab() {
  const { user } = useAuth()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security Settings</CardTitle>
        <CardDescription>Manage your account security and login settings.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium">Email Address</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Your current email address is {user?.email}
            </p>
            <Button variant="outline">Change email</Button>
          </div>
          <Separator />
          <div>
            <h3 className="text-lg font-medium">Password</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Update your password regularly to keep your account secure
            </p>
            <Button variant="outline">Change password</Button>
          </div>
          <Separator />
          <div>
            <h3 className="text-lg font-medium">Two-factor Authentication</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Add an extra layer of security to your account
            </p>
            <Button variant="outline">Configure 2FA</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
