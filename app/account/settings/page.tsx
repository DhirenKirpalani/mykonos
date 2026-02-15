'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { BackButton } from '@/components/common/BackButton'
import { LoadingSpinner } from '@/components/common'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Settings, Lock, Bell, Globe } from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/login')
      } else {
        setIsAuthenticated(true)
      }
      setIsLoading(false)
    }

    checkAuth()
  }, [router])

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-border/40 bg-luxury-gray-light py-12">
        <div className="container mx-auto px-4 lg:px-8">
          <Breadcrumbs items={[
            { label: 'Account', href: '/account' },
            { label: 'Settings', href: '/account/settings' }
          ]} />
          <h1 className="mt-4 font-serif text-4xl font-bold lg:text-5xl">Settings</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-4">
          <div className="space-y-2">
            <h2 className="font-serif text-xl font-bold">Account</h2>
            <nav className="space-y-1">
              <button onClick={() => router.push('/account')} className="block w-full rounded-md px-4 py-2 text-left text-sm hover:bg-luxury-gray-light">
                Profile
              </button>
              <button onClick={() => router.push('/account/orders')} className="block w-full rounded-md px-4 py-2 text-left text-sm hover:bg-luxury-gray-light">
                Orders
              </button>
              <button onClick={() => router.push('/account/addresses')} className="block w-full rounded-md px-4 py-2 text-left text-sm hover:bg-luxury-gray-light">
                Addresses
              </button>
              <button onClick={() => router.push('/account/settings')} className="block w-full rounded-md bg-luxury-gold px-4 py-2 text-left text-sm text-white">
                Settings
              </button>
            </nav>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <div className="rounded-lg border border-border/40 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Lock className="h-5 w-5 text-luxury-gold" />
                <h2 className="font-serif text-xl font-bold">Security</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Password</h3>
                  <p className="text-sm text-muted-foreground mb-3">Change your password to keep your account secure</p>
                  <Button variant="outline">Change Password</Button>
                </div>
                <div className="pt-4 border-t border-red-200">
                  <h3 className="font-medium mb-2 text-red-600">Delete Account</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  <Button 
                    variant="outline" 
                    className="border-red-600 text-red-600 hover:bg-red-50"
                    onClick={async () => {
                      const confirmation = prompt('Type "DELETE MY ACCOUNT" to confirm account deletion:')
                      if (confirmation === 'DELETE MY ACCOUNT') {
                        try {
                          const { data: { session } } = await supabase.auth.getSession()
                          if (!session) return

                          const response = await fetch('/api/account/delete', {
                            method: 'DELETE',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${session.access_token}`
                            },
                            body: JSON.stringify({ confirmation })
                          })

                          if (response.ok) {
                            await supabase.auth.signOut()
                            alert('Account deleted successfully')
                            router.push('/')
                          } else {
                            const data = await response.json()
                            alert(data.error || 'Failed to delete account')
                          }
                        } catch (error) {
                          alert('Failed to delete account')
                        }
                      }
                    }}
                  >
                    Delete Account
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border/40 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Bell className="h-5 w-5 text-luxury-gold" />
                <h2 className="font-serif text-xl font-bold">Notifications</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Order Updates</h3>
                    <p className="text-sm text-muted-foreground">Receive emails about your order status</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                </div>
                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <h3 className="font-medium">Promotions</h3>
                    <p className="text-sm text-muted-foreground">Receive emails about sales and new products</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border/40 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Globe className="h-5 w-5 text-luxury-gold" />
                <h2 className="font-serif text-xl font-bold">Preferences</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Language</h3>
                  <p className="text-sm text-muted-foreground mb-3">Choose your preferred language</p>
                  <LanguageSwitcher />
                </div>
                <div className="pt-4 border-t">
                  <h3 className="font-medium mb-2">Region</h3>
                  <p className="text-sm text-muted-foreground mb-3">Your preferred region for pricing and shipping</p>
                  <p className="text-sm">Use the region selector in the header to change your region</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
