'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/database.types'
import { useAuth } from '@/contexts/AuthContext'
import { ShippingAddresses } from '@/components/account/ShippingAddresses'
import { useLanguage } from '@/contexts/LanguageContext'

type UserProfile = Database['public']['Tables']['users']['Row']

export default function AccountPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { t } = useLanguage()
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
      if (!user || user.is_anonymous) return

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
  }, [user, authLoading])

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-luxury-gold/30 border-t-luxury-gold" />
      </div>
    )
  }

  if (!user || user.is_anonymous) return null

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-border/40 p-6 md:p-8">
        <h2 className="mb-6 font-serif text-2xl font-bold">{t.account.profileInformation}</h2>
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">{t.account.firstName}</label>
              <input
                type="text"
                value={userData.firstName}
                onChange={(e) => setUserData({ ...userData, firstName: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-4 py-3 focus:border-luxury-gold focus:outline-none focus:ring-1 focus:ring-luxury-gold"
                placeholder="John"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">{t.account.lastName}</label>
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
            <label className="mb-2 block text-sm font-medium">{t.account.email}</label>
            <input
              type="email"
              value={userData.email}
              onChange={(e) => setUserData({ ...userData, email: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-4 py-3 focus:border-luxury-gold focus:outline-none focus:ring-1 focus:ring-luxury-gold"
              placeholder="john@example.com"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">{t.account.phone}</label>
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
                const { error } = await (supabase.from('users') as any)
                  .update({
                    first_name: userData.firstName,
                    last_name: userData.lastName,
                    email: userData.email,
                    phone: userData.phone,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', user.id)
                if (error) {
                  alert('Error updating profile: ' + error.message)
                } else {
                  alert('Profile updated successfully!')
                }
              }}
            >
              {t.account.saveChanges}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={async () => {
                await supabase.auth.signOut()
                router.push('/login')
              }}
            >
              {t.account.logout}
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border/40 p-6 md:p-8">
        <h2 className="mb-6 font-serif text-2xl font-bold">{t.account.shippingAddresses}</h2>
        <ShippingAddresses userId={user.id} />
      </div>
    </div>
  )
}
