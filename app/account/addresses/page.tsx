'use client'

import { useAuth } from '@/contexts/AuthContext'
import { ShippingAddresses } from '@/components/account/ShippingAddresses'

export default function AddressesPage() {
  const { user } = useAuth()

  if (!user) return null

  return <ShippingAddresses userId={user.id} />
}
