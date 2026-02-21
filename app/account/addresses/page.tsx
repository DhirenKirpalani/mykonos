'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { LoadingSpinner } from '@/components/common'
import { ShippingAddresses } from '@/components/account/ShippingAddresses'
import { supabase } from '@/lib/supabase/client'

export default function AddressesPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [userId, setUserId] = useState<string>('')

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/login')
      } else {
        setIsAuthenticated(true)
        setUserId(session.user.id)
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
            { label: 'Addresses', href: '/account/addresses' }
          ]} />
          <h1 className="mt-4 font-serif text-4xl font-bold lg:text-5xl">My Addresses</h1>
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
              <button onClick={() => router.push('/account/addresses')} className="block w-full rounded-md bg-luxury-gold px-4 py-2 text-left text-sm text-white">
                Addresses
              </button>
              <button onClick={() => router.push('/account/settings')} className="block w-full rounded-md px-4 py-2 text-left text-sm hover:bg-luxury-gray-light">
                Settings
              </button>
            </nav>
          </div>

          <div className="lg:col-span-3">
            <ShippingAddresses userId={userId} />
          </div>
        </div>
      </div>
    </div>
  )
}
