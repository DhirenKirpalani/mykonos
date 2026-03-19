'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { LoadingSpinner } from '@/components/common'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/database.types'
import { useAuth } from '@/contexts/AuthContext'
import { ShippingAddresses } from '@/components/account/ShippingAddresses'
import { cn } from '@/lib/utils'

type UserProfile = Database['public']['Tables']['users']['Row']

export default function AccountPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isLoading: authLoading } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [userData, setUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  })

  useEffect(() => {
    const loadUserProfile = async () => {
      if (authLoading) return
      
      if (!user) {
        router.push('/login')
        return
      }

      if (user.is_anonymous) {
        router.push('/login?message=Please login to access your account')
        return
      }
      
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single() as { data: UserProfile | null; error: any }

      if (profile && !error) {
        setUserData({
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          email: profile.email || user.email || '',
          phone: profile.phone || '',
        })
      } else if (error) {
        const metadata = user.user_metadata
        const newProfile = {
          id: user.id,
          first_name: metadata?.first_name || '',
          last_name: metadata?.last_name || '',
          email: user.email || '',
          phone: metadata?.phone || '',
        }

        await (supabase.from('users') as any).insert(newProfile)
        
        setUserData({
          firstName: newProfile.first_name,
          lastName: newProfile.last_name,
          email: newProfile.email,
          phone: newProfile.phone || '',
        })
      }
      setIsLoading(false)
    }

    loadUserProfile()
  }, [user, authLoading, router])

  if (authLoading || isLoading) {
    return <LoadingSpinner />
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-border/40 bg-luxury-gray-light py-12">
        <div className="container mx-auto px-4 lg:px-8">
          <Breadcrumbs items={[{ label: 'Account', href: '/account' }]} />
          <h1 className="mt-4 mb-4 font-serif text-4xl font-bold lg:text-5xl">
            My Account
          </h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-4">
          <div className="space-y-2">
            <h2 className="font-serif text-xl font-bold">Account</h2>
            <nav className="space-y-1">
              <Link 
                href="/account"
                className={cn(
                  "block w-full rounded-md px-4 py-2 text-left text-sm transition-colors",
                  pathname === '/account'
                    ? "bg-luxury-gold text-white"
                    : "hover:bg-luxury-gray-light"
                )}
              >
                Profile
              </Link>
              <Link 
                href="/account/orders"
                className={cn(
                  "block w-full rounded-md px-4 py-2 text-left text-sm transition-colors",
                  pathname.startsWith('/account/orders')
                    ? "bg-luxury-gold text-white"
                    : "hover:bg-luxury-gray-light"
                )}
              >
                Orders
              </Link>
              <Link 
                href="/account/settings"
                className={cn(
                  "block w-full rounded-md px-4 py-2 text-left text-sm transition-colors",
                  pathname === '/account/settings'
                    ? "bg-luxury-gold text-white"
                    : "hover:bg-luxury-gray-light"
                )}
              >
                Settings
              </Link>
            </nav>
          </div>

          <div className="lg:col-span-3 space-y-8">
            <div className="rounded-lg border border-border/40 p-8">
              <h2 className="mb-6 font-serif text-2xl font-bold">Profile Information</h2>
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={userData.firstName}
                      onChange={(e) => setUserData({ ...userData, firstName: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-4 py-3 focus:border-luxury-gold focus:outline-none focus:ring-1 focus:ring-luxury-gold"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={userData.lastName}
                      onChange={(e) => setUserData({ ...userData, lastName: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-4 py-3 focus:border-luxury-gold focus:outline-none focus:ring-1 focus:ring-luxury-gold"
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Email
                  </label>
                  <input
                    type="email"
                    value={userData.email}
                    onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-4 py-3 focus:border-luxury-gold focus:outline-none focus:ring-1 focus:ring-luxury-gold"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={userData.phone}
                    onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-4 py-3 focus:border-luxury-gold focus:outline-none focus:ring-1 focus:ring-luxury-gold"
                    placeholder="+62 812-3456-7890"
                  />
                </div>
                <div className="flex gap-4">
                  <Button 
                    variant="luxury" 
                    size="lg"
                    onClick={async () => {
                      if (!user) return

                      const updateData = {
                        first_name: userData.firstName,
                        last_name: userData.lastName,
                        email: userData.email,
                        phone: userData.phone,
                        updated_at: new Date().toISOString(),
                      }

                      const { error } = await (supabase.from('users') as any)
                        .update(updateData)
                        .eq('id', user.id)

                      if (error) {
                        alert('Error updating profile: ' + error.message)
                      } else {
                        alert('Profile updated successfully!')
                      }
                    }}
                  >
                    Save Changes
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={async () => {
                      await supabase.auth.signOut()
                      router.push('/login')
                    }}
                  >
                    Logout
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border/40 p-8">
              <h2 className="mb-6 font-serif text-2xl font-bold">Shipping Addresses</h2>
              <ShippingAddresses userId={user.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
