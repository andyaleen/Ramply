'use client'

import { Button } from "@/components/ui/button"
import { Layout } from "@/components/layout"
import { useRouter } from 'next/navigation'

import { 
  Building, 
  FileText, 
  Shield, 
  Users, 
  ArrowRight,
  MoreVertical
} from "lucide-react"

const trustedCompanies = [
  "COMPASS", "L'OREAL", "Zendesk", "Dropbox", "GONG", "Carnival", 
  "INDIANA UNIVERSITY", "DOORDASH", "NHL"
]

export default function Landing() {
  const router = useRouter()
  
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Content */}
            <div className="space-y-8">
              <div className="space-y-6">
                <h1 className="text-5xl font-bold text-gray-900 leading-tight">
                  Effortless Onboarding Starts Here
                </h1>
                
                <p className="text-xl text-gray-600 max-w-md">
                  Say goodbye to endless paperwork. Simplify onboarding with the fastest, easiest tool built for modern teams.
                </p>
              </div>

              {/* Auth Buttons */}
              <div className="space-y-4">
                <Button 
                  className="w-full max-w-sm bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-medium"
                  onClick={() => router.push('/signup')}
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </Button>
                
                <div className="flex items-center max-w-sm">
                  <div className="flex-1 border-t border-gray-300" />
                  <span className="px-4 text-gray-500 text-sm">OR</span>
                  <div className="flex-1 border-t border-gray-300" />
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full max-w-sm border-gray-300 h-12 text-base font-medium"
                  onClick={() => router.push('/signup')}
                >
                  Sign up free with email
                </Button>
                
                <p className="text-sm text-gray-600 max-w-sm">
                  No credit card required
                </p>
              </div>
            </div>

            {/* Right side - Demo Interface */}
            <div className="relative">
              {/* Vendor Onboarding Card */}
              <div className="bg-white rounded-2xl shadow-2xl p-6 transform rotate-3 hover:rotate-0 transition-transform duration-300 max-w-sm">
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        Standard Vendor Onboarding
                      </h3>
                      <p className="text-sm text-gray-600">
                        Complete vendor setup with all required documents
                      </p>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {/* Required Information */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Required Information</h4>
                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-gray-700">
                        <div className="w-5 h-5 bg-blue-100 rounded-sm flex items-center justify-center mr-3">
                          <Building className="w-3 h-3 text-blue-600" />
                        </div>
                        Company Legal Information
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-700">
                        <div className="w-5 h-5 bg-blue-100 rounded-sm flex items-center justify-center mr-3">
                          <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M2 6C2 4.89543 2.89543 4 4 4H20C21.1046 4 22 4.89543 22 6V18C22 19.1046 21.1046 20 20 20H4C2.89543 20 2 19.1046 2 18V6ZM4 6V18H20V6H4ZM6 8H18V10H6V8ZM6 12H14V14H6V12Z"/>
                          </svg>
                        </div>
                        Banking & Payment Details
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-700">
                        <div className="w-5 h-5 bg-blue-100 rounded-sm flex items-center justify-center mr-3">
                          <FileText className="w-3 h-3 text-blue-600" />
                        </div>
                        Tax Documentation (W-9)
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-700">
                        <div className="w-5 h-5 bg-blue-100 rounded-sm flex items-center justify-center mr-3">
                          <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17 13H7V11H17M17 17H7V15H17M12 3L19.36 6.04C19.75 6.22 20 6.6 20 7.04V19C20 19.55 19.55 20 19 20H5C4.45 20 4 19.55 4 19V7.04C4 6.6 4.25 6.22 4.64 6.04L12 3M18 8H6V18H18V8Z"/>
                          </svg>
                        </div>
                        Primary Contact Information
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex space-x-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 border-gray-300"
                    >
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z"/>
                      </svg>
                      Copy link
                    </Button>
                    <Button variant="outline" size="sm" className="border-gray-300">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
                      </svg>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted by section */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-gray-600 mb-8">
              Trusted by more than <span className="font-semibold">100,000</span> of the world&apos;s leading organizations
            </p>
            
            <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-9 gap-8 items-center opacity-60">
              {trustedCompanies.map((company) => (
                <div key={company} className="text-center">
                  <span className="text-sm font-medium text-gray-500">{company}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything you need to onboard vendors
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Streamline your vendor management process with secure, automated onboarding that saves time and reduces manual work.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Secure & Compliant</h3>
              <p className="text-gray-600">
                Bank-level security with encrypted data transmission and secure document storage that meets enterprise compliance standards.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-6">
                <FileText className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Document Collection</h3>
              <p className="text-gray-600">
                Automatically collect W-9s, insurance certificates, banking information, and other required documents with validation.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Easy Collaboration</h3>
              <p className="text-gray-600">
                Send secure onboarding links to vendors and track progress in real-time with automated notifications and reminders.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to streamline your vendor onboarding?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of companies that trust VendorFlow for their vendor management needs.
          </p>
          <Button 
            size="lg"
            className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-3"
            onClick={() => router.push('/signup')}
          >
            Get started for free
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>
    </Layout>
  )
}