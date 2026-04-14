'use client'

import { Button } from "@/components/ui/button"
import { Layout } from "@/components/layout"
import { useRouter } from "next/navigation"
import { Building2, CheckCircle, FileText, Landmark, MoreVertical, ShieldCheck } from "lucide-react"

const requiredInfo = [
  {
    label: "Company Legal Information",
    icon: Building2,
  },
  {
    label: "Banking & Payment Details",
    icon: Landmark,
  },
  {
    label: "Tax Documentation (W-9)",
    icon: FileText,
  },
  {
    label: "Certificate of Insurance",
    icon: ShieldCheck,
  },
]

/**
 * Landing page hero layout that mirrors the product mock.
 */
export default function Landing() {
  const router = useRouter()

  return (
    <Layout>
      <section className="bg-[#f6f5f0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            <div className="bg-[#f9f8f4] rounded-2xl p-8 md:p-10 shadow-sm border border-[#ece9df]">
              <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase">
                Vendor Onboarding, Solved
              </p>

              <h1 className="mt-4 text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
                One profile.<br />
                Every partner.<br />
                Zero forms.
              </h1>

              <p className="mt-5 text-lg text-gray-600 max-w-md leading-relaxed">
                Ramply replaces the endless cycle of vendor onboarding forms with a single, secure profile you share in one click. Your W-9s, certificates, and company data, always ready.
              </p>

              <div className="mt-8 space-y-4">
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
                  Sign up with email
                </Button>

                <p className="text-sm text-gray-500 max-w-sm">
                  No credit card required
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center lg:justify-end">
              <div className="flex flex-col lg:flex-row gap-6 items-start">

                <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100">
                  <div className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs font-semibold tracking-widest text-blue-500 uppercase mb-1">Shared via Ramply</p>
                        <h3 className="text-lg font-semibold text-gray-900">Standard Vendor Onboarding</h3>
                        <p className="text-sm text-gray-500 mt-0.5">Complete vendor setup with all required documents</p>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600 ml-2" aria-label="More options">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase">Required Information</p>
                      <div className="mt-3 space-y-2">
                        {requiredInfo.map((item) => (
                          <div key={item.label} className="flex items-center text-sm text-gray-600">
                            <item.icon className="w-4 h-4 text-blue-500 mr-2" />
                            {item.label}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center text-sm text-blue-600 font-medium">
                      <CheckCircle className="w-4 h-4 mr-2 text-blue-500" />
                      Verified and shared
                    </div>

                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" className="flex-1 border-gray-200">
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z"/>
                        </svg>
                        Copy link
                      </Button>
                      <Button variant="outline" size="sm" className="border-gray-200">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
                        </svg>
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="w-full max-w-xs space-y-4">
                  <div className="bg-white rounded-2xl shadow-md p-5 border border-gray-100">
                    <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">Certificate of Insurance</p>
                    <p className="text-base font-semibold text-gray-900">General Liability</p>
                    <div className="mt-3 h-1.5 w-full bg-blue-100 rounded-full" />
                    <div className="mt-2 h-1.5 w-3/4 bg-blue-50 rounded-full" />
                  </div>

                  <div className="bg-white rounded-2xl shadow-md p-5 border border-gray-100">
                    <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">Tax Document</p>
                    <p className="text-base font-semibold text-gray-900">W-9 Form</p>
                    <div className="mt-3 h-1.5 w-full bg-blue-100 rounded-full" />
                    <div className="mt-2 h-1.5 w-2/3 bg-blue-50 rounded-full" />
                  </div>

                  <div className="bg-white rounded-2xl shadow-md p-5 border border-gray-100">
                    <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">Resale Certificate</p>
                    <p className="text-base font-semibold text-gray-900">State Tax Exemption</p>
                    <div className="mt-3 h-1.5 w-full bg-blue-100 rounded-full" />
                    <div className="mt-2 h-1.5 w-1/2 bg-blue-50 rounded-full" />
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  )
}
