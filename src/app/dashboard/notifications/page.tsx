'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { 
  Bell, 
  Mail, 
  Check, 
  X, 
  Clock, 
  Users, 
  FileText, 
  Settings,
  Trash2,
  MarkAsUnread,
  Archive
} from 'lucide-react'
import { useState } from 'react'

// Mock notification data
const notifications = [
  {
    id: '1',
    type: 'request_update',
    title: 'Vendor onboarding completed',
    message: 'ABC Corporation has completed their onboarding process',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    read: false,
    category: 'Vendor Updates'
  },
  {
    id: '2',
    type: 'system_update',
    title: 'New feature available',
    message: 'Document templates are now available in the onboarding types section',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    read: true,
    category: 'System Updates'
  },
  {
    id: '3',
    type: 'request_reminder',
    title: 'Pending vendor response',
    message: 'XYZ Corp has not submitted required documents. Last reminder sent 2 days ago.',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    read: false,
    category: 'Reminders'
  },
  {
    id: '4',
    type: 'vendor_completion',
    title: 'Document uploaded',
    message: 'DEF Industries uploaded their tax certificate',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    read: true,
    category: 'Vendor Updates'
  },
  {
    id: '5',
    type: 'system_maintenance',
    title: 'Scheduled maintenance',
    message: 'System maintenance scheduled for this weekend from 2-4 AM EST',
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
    read: false,
    category: 'System Updates'
  }
]

const notificationSettings = {
  email_notifications: true,
  request_updates: true,
  vendor_completions: true,
  system_updates: false,
  reminders: true,
  digest_frequency: 'daily'
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('all')
  const [settings, setSettings] = useState(notificationSettings)
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([])

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'request_update':
      case 'request_reminder':
        return <FileText className="h-4 w-4" />
      case 'vendor_completion':
        return <Users className="h-4 w-4" />
      case 'system_update':
      case 'system_maintenance':
        return <Settings className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'request_update':
        return 'default'
      case 'vendor_completion':
        return 'secondary'
      case 'system_update':
        return 'outline'
      case 'request_reminder':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`
    } else {
      return 'Just now'
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'all') return true
    if (activeTab === 'unread') return !notification.read
    if (activeTab === 'read') return notification.read
    return true
  })

  const unreadCount = notifications.filter(n => !n.read).length

  const toggleNotificationSelection = (id: string) => {
    setSelectedNotifications(prev => 
      prev.includes(id) 
        ? prev.filter(nId => nId !== id)
        : [...prev, id]
    )
  }

  const markAsRead = (ids: string[]) => {
    // Implementation for marking notifications as read
    console.log('Marking as read:', ids)
    setSelectedNotifications([])
  }

  const deleteNotifications = (ids: string[]) => {
    // Implementation for deleting notifications
    console.log('Deleting:', ids)
    setSelectedNotifications([])
  }

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-muted-foreground">
              Stay updated with your onboarding activities
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {unreadCount} unread
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">
                Unread ({unreadCount})
              </TabsTrigger>
              <TabsTrigger value="read">Read</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            
            {selectedNotifications.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => markAsRead(selectedNotifications)}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Mark as read
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => deleteNotifications(selectedNotifications)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            )}
          </div>

          <TabsContent value="all" className="space-y-4">
            <NotificationsList 
              notifications={filteredNotifications}
              selectedNotifications={selectedNotifications}
              onToggleSelection={toggleNotificationSelection}
              getNotificationIcon={getNotificationIcon}
              getBadgeVariant={getBadgeVariant}
              formatTimeAgo={formatTimeAgo}
            />
          </TabsContent>

          <TabsContent value="unread" className="space-y-4">
            <NotificationsList 
              notifications={filteredNotifications}
              selectedNotifications={selectedNotifications}
              onToggleSelection={toggleNotificationSelection}
              getNotificationIcon={getNotificationIcon}
              getBadgeVariant={getBadgeVariant}
              formatTimeAgo={formatTimeAgo}
            />
          </TabsContent>

          <TabsContent value="read" className="space-y-4">
            <NotificationsList 
              notifications={filteredNotifications}
              selectedNotifications={selectedNotifications}
              onToggleSelection={toggleNotificationSelection}
              getNotificationIcon={getNotificationIcon}
              getBadgeVariant={getBadgeVariant}
              formatTimeAgo={formatTimeAgo}
            />
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Configure how and when you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Email Notifications</h4>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via email
                      </p>
                    </div>
                    <Switch
                      checked={settings.email_notifications}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({ ...prev, email_notifications: checked }))
                      }
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Request Updates</h4>
                      <p className="text-sm text-muted-foreground">
                        Get notified when onboarding requests change status
                      </p>
                    </div>
                    <Switch
                      checked={settings.request_updates}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({ ...prev, request_updates: checked }))
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Vendor Completions</h4>
                      <p className="text-sm text-muted-foreground">
                        Get notified when vendors complete onboarding
                      </p>
                    </div>
                    <Switch
                      checked={settings.vendor_completions}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({ ...prev, vendor_completions: checked }))
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">System Updates</h4>
                      <p className="text-sm text-muted-foreground">
                        Receive updates about new features and improvements
                      </p>
                    </div>
                    <Switch
                      checked={settings.system_updates}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({ ...prev, system_updates: checked }))
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Reminders</h4>
                      <p className="text-sm text-muted-foreground">
                        Get reminded about pending actions
                      </p>
                    </div>
                    <Switch
                      checked={settings.reminders}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({ ...prev, reminders: checked }))
                      }
                    />
                  </div>
                </div>
                
                <div className="pt-4">
                  <Button>Save Settings</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// Component for rendering the notifications list
function NotificationsList({ 
  notifications, 
  selectedNotifications, 
  onToggleSelection,
  getNotificationIcon,
  getBadgeVariant,
  formatTimeAgo
}: {
  notifications: any[]
  selectedNotifications: string[]
  onToggleSelection: (id: string) => void
  getNotificationIcon: (type: string) => React.ReactNode
  getBadgeVariant: (type: string) => any
  formatTimeAgo: (timestamp: Date) => string
}) {
  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Bell className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No notifications</h3>
          <p className="text-muted-foreground text-center max-w-sm">
            You're all caught up! New notifications will appear here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {notifications.map((notification) => (
        <Card 
          key={notification.id} 
          className={`cursor-pointer transition-colors hover:bg-muted/50 ${
            !notification.read ? 'border-primary/20 bg-primary/5' : ''
          } ${
            selectedNotifications.includes(notification.id) ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => onToggleSelection(notification.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-start space-x-4">
              <div className={`p-2 rounded-lg ${
                !notification.read ? 'bg-primary/10' : 'bg-muted'
              }`}>
                {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className={`text-sm font-medium truncate ${
                    !notification.read ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {notification.title}
                  </h4>
                  <div className="flex items-center space-x-2 ml-2">
                    <Badge variant={getBadgeVariant(notification.type)} className="text-xs">
                      {notification.category}
                    </Badge>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {notification.message}
                </p>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatTimeAgo(notification.timestamp)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
