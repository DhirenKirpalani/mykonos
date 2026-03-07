'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { BackButton } from '@/components/common/BackButton'
import { LoadingSpinner } from '@/components/common'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Lock, Globe } from 'lucide-react'

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
              </div>
            </div>

            <div className="rounded-lg border border-border/40 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Globe className="h-5 w-5 text-luxury-gold" />
                <h2 className="font-serif text-xl font-bold">Language Preferences</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Language</h3>
                  <p className="text-sm text-muted-foreground mb-3">Choose your preferred language for the website</p>
                  <LanguageSwitcher />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
