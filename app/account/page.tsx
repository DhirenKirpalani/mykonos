'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/database.types'

type UserProfile = Database['public']['Tables']['users']['Row']

export default function AccountPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [userData, setUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  })
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/login')
      } else {
        setIsAuthenticated(true)
        setUserId(session.user.id)
        
        // Fetch user profile data
        const { data: profile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single() as { data: UserProfile | null; error: any }

        if (profile && !error) {
          setUserData({
            firstName: profile.first_name || '',
            lastName: profile.last_name || '',
            email: profile.email || session.user.email || '',
            phone: profile.phone || '',
          })
        } else if (error) {
          // If profile doesn't exist, create it with auth metadata
          const metadata = session.user.user_metadata
          const newProfile = {
            id: session.user.id,
            first_name: metadata?.first_name || '',
            last_name: metadata?.last_name || '',
            email: session.user.email || '',
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
      }
      setIsLoading(false)
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-luxury-gold border-t-transparent mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-border/40 bg-luxury-gray-light py-12">
        <div className="container mx-auto px-4 lg:px-8">
          <h1 className="mb-4 font-serif text-4xl font-bold lg:text-5xl">
            My Account
          </h1>
          <p className="text-lg text-muted-foreground">
            Manage your account settings and orders
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-4">
          <div className="space-y-2">
            <h2 className="font-serif text-xl font-bold">Account</h2>
            <nav className="space-y-1">
              <button className="block w-full rounded-md bg-luxury-gold px-4 py-2 text-left text-sm text-white">
                Profile
              </button>
              <button className="block w-full rounded-md px-4 py-2 text-left text-sm hover:bg-luxury-gray-light">
                Orders
              </button>
              <button className="block w-full rounded-md px-4 py-2 text-left text-sm hover:bg-luxury-gray-light">
                Wishlist
              </button>
              <button className="block w-full rounded-md px-4 py-2 text-left text-sm hover:bg-luxury-gray-light">
                Addresses
              </button>
              <button className="block w-full rounded-md px-4 py-2 text-left text-sm hover:bg-luxury-gray-light">
                Settings
              </button>
            </nav>
          </div>

          <div className="lg:col-span-3">
            <div className="rounded-lg border border-border/40 p-8">
              <h2 className="mb-6 font-serif text-2xl font-bold">Profile</h2>
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
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div className="flex gap-4">
                  <Button 
                    variant="luxury" 
                    size="lg"
                    onClick={async () => {
                      if (!userId) return

                      const updateData = {
                        first_name: userData.firstName,
                        last_name: userData.lastName,
                        email: userData.email,
                        phone: userData.phone,
                        updated_at: new Date().toISOString(),
                      }

                      const { error } = await (supabase.from('users') as any)
                        .update(updateData)
                        .eq('id', userId)

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
          </div>
        </div>
      </div>
    </div>
  )
}
