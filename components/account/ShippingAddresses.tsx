'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/database.types'
import { MapPin, Plus, Edit, Trash2, Star } from 'lucide-react'
import { toast } from 'sonner'
import { COUNTRIES } from '@/lib/constants'

type ShippingAddress = Database['public']['Tables']['shipping_addresses']['Row']
type ShippingAddressInsert = Database['public']['Tables']['shipping_addresses']['Insert']
type ShippingAddressUpdate = Database['public']['Tables']['shipping_addresses']['Update']

interface ShippingAddressesProps {
  userId: string
}

export function ShippingAddresses({ userId }: ShippingAddressesProps) {
  const [addresses, setAddresses] = useState<ShippingAddress[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingAddress, setEditingAddress] = useState<ShippingAddress | null>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state_province: '',
    postal_code: '',
    country: 'US',
    phone: '',
    is_default: false,
  })

  useEffect(() => {
    fetchAddresses()
  }, [userId])

  const fetchAddresses = async () => {
    try {
      const { data, error } = await supabase
        .from('shipping_addresses')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setAddresses(data || [])
    } catch (error: any) {
      toast.error('Failed to load addresses', {
        description: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      full_name: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state_province: '',
      postal_code: '',
      country: 'US',
      phone: '',
      is_default: false,
    })
    setEditingAddress(null)
    setShowForm(false)
  }

  const handleEdit = (address: ShippingAddress) => {
    setFormData({
      full_name: address.full_name,
      address_line1: address.address_line1,
      address_line2: address.address_line2 || '',
      city: address.city,
      state_province: address.state_province,
      postal_code: address.postal_code,
      country: address.country,
      phone: address.phone,
      is_default: address.is_default ?? false,
    })
    setEditingAddress(address)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (formData.is_default) {
        await (supabase
          .from('shipping_addresses') as any)
          .update({ is_default: false })
          .eq('user_id', userId)
      }

      if (editingAddress) {
        const updateData: ShippingAddressUpdate = {
          ...formData,
          updated_at: new Date().toISOString(),
        }
        
        const { error } = await (supabase
          .from('shipping_addresses') as any)
          .update(updateData)
          .eq('id', editingAddress.id)

        if (error) throw error
        toast.success('Address updated successfully!')
      } else {
        const insertData: ShippingAddressInsert = {
          ...formData,
          user_id: userId,
        }
        
        const { error } = await (supabase
          .from('shipping_addresses') as any)
          .insert(insertData)

        if (error) throw error
        toast.success('Address added successfully!')
      }

      resetForm()
      fetchAddresses()
    } catch (error: any) {
      toast.error('Failed to save address', {
        description: error.message,
      })
    }
  }

  const handleDelete = async (addressId: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return

    try {
      const { error } = await supabase
        .from('shipping_addresses')
        .delete()
        .eq('id', addressId)

      if (error) throw error
      toast.success('Address deleted successfully!')
      fetchAddresses()
    } catch (error: any) {
      toast.error('Failed to delete address', {
        description: error.message,
      })
    }
  }

  const handleSetDefault = async (addressId: string) => {
    try {
      await (supabase
        .from('shipping_addresses') as any)
        .update({ is_default: false })
        .eq('user_id', userId)

      const { error } = await (supabase
        .from('shipping_addresses') as any)
        .update({ is_default: true })
        .eq('id', addressId)

      if (error) throw error
      toast.success('Default address updated!')
      fetchAddresses()
    } catch (error: any) {
      toast.error('Failed to update default address', {
        description: error.message,
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-luxury-gold border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-md bg-luxury-gold px-4 py-2 text-sm font-medium text-luxury-navy transition-all hover:bg-luxury-gold-light"
        >
          <Plus className="h-4 w-4" />
          Add New Address
        </button>
      )}

      {showForm && (
        <div className="rounded-lg border border-border/40 bg-white p-6">
          <h3 className="mb-4 font-serif text-xl font-bold">
            {editingAddress ? 'Edit Address' : 'Add New Address'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Full Name *</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
                className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm focus:border-luxury-gold focus:outline-none focus:ring-1 focus:ring-luxury-gold"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Address Line 1 *</label>
              <input
                type="text"
                value={formData.address_line1}
                onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                required
                className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm focus:border-luxury-gold focus:outline-none focus:ring-1 focus:ring-luxury-gold"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Address Line 2</label>
              <input
                type="text"
                value={formData.address_line2}
                onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm focus:border-luxury-gold focus:outline-none focus:ring-1 focus:ring-luxury-gold"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">City *</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                  className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm focus:border-luxury-gold focus:outline-none focus:ring-1 focus:ring-luxury-gold"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">State/Province *</label>
                <input
                  type="text"
                  value={formData.state_province}
                  onChange={(e) => setFormData({ ...formData, state_province: e.target.value })}
                  required
                  className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm focus:border-luxury-gold focus:outline-none focus:ring-1 focus:ring-luxury-gold"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Postal Code *</label>
                <input
                  type="text"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  required
                  className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm focus:border-luxury-gold focus:outline-none focus:ring-1 focus:ring-luxury-gold"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Country *</label>
                <select
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  required
                  className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm focus:border-luxury-gold focus:outline-none focus:ring-1 focus:ring-luxury-gold"
                >
                  {COUNTRIES.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Phone Number *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm focus:border-luxury-gold focus:outline-none focus:ring-1 focus:ring-luxury-gold"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_default"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-luxury-gold focus:ring-luxury-gold"
              />
              <label htmlFor="is_default" className="ml-2 text-sm text-muted-foreground">
                Set as default address
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-md bg-luxury-gold px-6 py-2 text-sm font-medium text-luxury-navy transition-all hover:bg-luxury-gold-light"
              >
                {editingAddress ? 'Update Address' : 'Add Address'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-md border border-border/40 px-6 py-2 text-sm font-medium transition-all hover:bg-luxury-gray-light"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {addresses.length === 0 && !showForm ? (
        <div className="rounded-lg border border-border/40 bg-luxury-gray-light p-12 text-center">
          <MapPin className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 font-serif text-xl font-bold">No Addresses Yet</h3>
          <p className="text-sm text-muted-foreground">
            Add a shipping address to make checkout faster.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((address) => (
            <div
              key={address.id}
              className="rounded-lg border border-border/40 bg-white p-6 relative"
            >
              {address.is_default && (
                <div className="absolute right-4 top-4">
                  <span className="inline-flex items-center gap-1 rounded-full bg-luxury-gold px-3 py-1 text-xs font-medium text-luxury-navy">
                    <Star className="h-3 w-3 fill-current" />
                    Default
                  </span>
                </div>
              )}

              <div className="mb-4">
                <h4 className="font-medium">{address.full_name}</h4>
                <div className="mt-2 text-sm text-muted-foreground">
                  <p>{address.address_line1}</p>
                  {address.address_line2 && <p>{address.address_line2}</p>}
                  <p>
                    {address.city}, {address.state_province} {address.postal_code}
                  </p>
                  <p>{COUNTRIES.find((c) => c.code === address.country)?.name || address.country}</p>
                  <p className="mt-1">{address.phone}</p>
                </div>
              </div>

              <div className="flex gap-2">
                {!address.is_default && (
                  <button
                    onClick={() => handleSetDefault(address.id)}
                    className="flex-1 rounded-md border border-border/40 px-3 py-2 text-sm font-medium transition-all hover:bg-luxury-gray-light"
                  >
                    Set as Default
                  </button>
                )}
                <button
                  onClick={() => handleEdit(address)}
                  className="rounded-md border border-border/40 p-2 text-muted-foreground transition-all hover:bg-luxury-gray-light"
                  title="Edit"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(address.id)}
                  className="rounded-md border border-red-200 p-2 text-red-600 transition-all hover:bg-red-50"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
