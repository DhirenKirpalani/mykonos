'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { BackButton } from '@/components/common/BackButton'
import { LoadingSpinner } from '@/components/common'
import { ShippingAddresses } from '@/components/account/ShippingAddresses'
import { supabase } from '@/lib/supabase/client'
import { Plus, MapPin, Edit, Trash2 } from 'lucide-react'

type Address = {
  id: string
  full_name: string
  address_line1: string
  address_line2: string | null
  city: string
  state_province: string
  postal_code: string
  country: string
  phone: string
  is_default: boolean
}

export default function AddressesPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [addresses, setAddresses] = useState<Address[]>([])

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/login')
      } else {
        setIsAuthenticated(true)
        await fetchAddresses(session.user.id)
      }
      setIsLoading(false)
    }

    checkAuth()
  }, [router])

  const fetchAddresses = async (userId: string) => {
    const { data, error } = await supabase
      .from('shipping_addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })

    if (data && !error) {
      setAddresses(data as Address[])
    }
  }

  const deleteAddress = async (addressId: string) => {
    const { error } = await supabase
      .from('shipping_addresses')
      .delete()
      .eq('id', addressId)

    if (!error) {
      setAddresses(prev => prev.filter(addr => addr.id !== addressId))
    }
  }

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
              <button onClick={() => router.push('/account/wishlist')} className="block w-full rounded-md px-4 py-2 text-left text-sm hover:bg-luxury-gray-light">
                Wishlist
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
            <div className="mb-6">
              <Button variant="luxury" size="lg" className="gap-2">
                <Plus className="h-4 w-4" />
                Add New Address
              </Button>
            </div>

            {addresses.length === 0 ? (
              <div className="rounded-lg border border-border/40 p-12 text-center">
                <MapPin className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="font-serif text-2xl font-bold mb-2">No addresses saved</h3>
                <p className="text-muted-foreground">Add a shipping address to get started</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {addresses.map((address) => (
                  <div key={address.id} className="rounded-lg border border-border/40 p-6 relative">
                    {address.is_default && (
                      <span className="absolute top-4 right-4 px-2 py-1 bg-luxury-gold text-white text-xs rounded-full">
                        Default
                      </span>
                    )}
                    <h3 className="font-semibold text-lg mb-2">{address.full_name}</h3>
                    <p className="text-sm text-muted-foreground mb-1">{address.address_line1}</p>
                    {address.address_line2 && (
                      <p className="text-sm text-muted-foreground mb-1">{address.address_line2}</p>
                    )}
                    <p className="text-sm text-muted-foreground mb-1">
                      {address.city}, {address.state_province} {address.postal_code}
                    </p>
                    <p className="text-sm text-muted-foreground mb-1">{address.country}</p>
                    <p className="text-sm text-muted-foreground mb-4">{address.phone}</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-2">
                        <Edit className="h-3 w-3" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2 text-red-600 hover:text-red-700"
                        onClick={() => deleteAddress(address.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
