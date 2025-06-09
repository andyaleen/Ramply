'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  FileSearch, 
  ArrowLeft, 
  Home
} from 'lucide-react'
import { dashboardRoutes, getRouteConfig, getAllCategories } from '@/lib/dashboard-config'

interface RouteConfig {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  component: string
  category?: string
  badge?: string
  permissions?: string[]
  isNew?: boolean
  isComingSoon?: boolean
}

// Generic page components for dynamic routes
const GenericPageComponent = ({ route, routeConfig }: { route: string, routeConfig: RouteConfig }) => {
  return (
    <div className="container mx-auto py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <routeConfig.icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{routeConfig.title}</h1>
            <p className="text-muted-foreground">{routeConfig.description}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
            <CardDescription>
              This section is currently under development
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
            <div className="pt-4">
              <Badge variant="secondary">Feature in development</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Placeholder Content</CardTitle>
            <CardDescription>
              This is a dynamically generated page for the {route} section
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This page demonstrates the dynamic routing capabilities of the dashboard. 
              The content shown here is generated based on the route configuration and 
              can be customized for each specific section.
            </p>
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Route Information:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Route: /{route}</li>
                <li>• Component: {routeConfig.component}</li>
                <li>• Status: Dynamic placeholder</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function DynamicDashboardPage() {
  const params = useParams()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  
  // Handle the slug parameter (can be string or string[])
  const slug = Array.isArray(params.slug) ? params.slug : [params.slug].filter(Boolean)
  const route = slug.join('/')
  
  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 500)
    
    return () => clearTimeout(timer)
  }, [route])

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-96" />
            </div>
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }
  const routeConfig = getRouteConfig(route)

  if (!routeConfig) {
    return (
      <div className="container mx-auto py-10">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center">
            <div className="p-4 bg-muted rounded-lg inline-block mb-4">
              <FileSearch className="h-12 w-12 text-muted-foreground" />
            </div>            <h1 className="text-3xl font-bold mb-2">Page Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The dashboard section &quot;/{route}&quot; doesn&apos;t exist or hasn&apos;t been configured yet.
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => router.back()} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
              <Button onClick={() => router.push('/dashboard')}>
                <Home className="h-4 w-4 mr-2" />
                Dashboard Home
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Available Dashboard Sections</CardTitle>
              <CardDescription>
                Here are the currently available dashboard sections:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {getAllCategories().map((category) => (
                  <div key={category} className="space-y-3">
                    <h3 className="text-lg font-semibold capitalize">{category}</h3>
                    <div className="grid gap-3 md:grid-cols-2">                      {Object.entries(dashboardRoutes)
                        .filter(([, config]) => config.category === category)
                        .map(([key, config]) => (
                          <Button
                            key={key}
                            variant="outline"
                            className="justify-start h-auto p-4"
                            onClick={() => router.push(`/dashboard/${key}`)}
                            disabled={config.isComingSoon}
                          >
                            <config.icon className="h-4 w-4 mr-3" />
                            <div className="text-left flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{config.title}</span>
                                {config.isNew && (
                                  <Badge variant="default" className="text-xs">New</Badge>
                                )}
                                {config.isComingSoon && (
                                  <Badge variant="secondary" className="text-xs">Soon</Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {config.description}
                              </div>
                            </div>
                          </Button>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return <GenericPageComponent route={route} routeConfig={routeConfig} />
}
