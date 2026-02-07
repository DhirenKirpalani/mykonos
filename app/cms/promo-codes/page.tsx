'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface PromoCode {
  id: string
  code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_purchase_amount: number | null
  max_uses: number | null
  uses_count: number
  is_active: boolean
  valid_from: string
  valid_until: string | null
}

export default function PromoCodesPage() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchPromoCodes()
  }, [])

  const fetchPromoCodes = async () => {
    try {
      const response = await fetch('/api/promo-codes')
      if (response.ok) {
        const data = await response.json()
        setPromoCodes(data)
      }
    } catch (error) {
      console.error('Error fetching promo codes:', error)
    } finally {
      setLoading(false)
    }
  }

  const togglePromoCode = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/promo-codes/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      })
      if (response.ok) {
        fetchPromoCodes()
      }
    } catch (error) {
      console.error('Error toggling promo code:', error)
    }
  }

  const deletePromoCode = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promo code?')) return
    
    try {
      const response = await fetch(`/api/promo-codes/${id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        fetchPromoCodes()
      }
    } catch (error) {
      console.error('Error deleting promo code:', error)
    }
  }

  const filteredPromoCodes = promoCodes.filter(promo =>
    promo.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Loading promo codes...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Promo Codes</h1>
          <p className="mt-2 text-gray-600">Manage discount codes and promotions</p>
        </div>
        <Link href="/cms/promo-codes/new">
          <Button className="bg-luxury-gold text-luxury-navy hover:bg-luxury-gold/90">
            <Plus className="mr-2 h-4 w-4" />
            Create Promo Code
          </Button>
        </Link>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search promo codes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left text-sm font-medium text-gray-500">
                <th className="pb-3">Code</th>
                <th className="pb-3">Discount</th>
                <th className="pb-3">Usage</th>
                <th className="pb-3">Valid Until</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPromoCodes.map((promo) => (
                <tr key={promo.id} className="text-sm">
                  <td className="py-4">
                    <div className="font-mono font-medium text-gray-900">{promo.code}</div>
                  </td>
                  <td className="py-4 text-gray-900">
                    {promo.discount_type === 'percentage' 
                      ? `${promo.discount_value}%` 
                      : `$${promo.discount_value.toFixed(2)}`}
                  </td>
                  <td className="py-4 text-gray-600">
                    {promo.uses_count} / {promo.max_uses || '∞'}
                  </td>
                  <td className="py-4 text-gray-600">
                    {promo.valid_until 
                      ? new Date(promo.valid_until).toLocaleDateString()
                      : 'No expiry'}
                  </td>
                  <td className="py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        promo.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {promo.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <Link href={`/cms/promo-codes/${promo.id}`}>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePromoCode(promo.id, promo.is_active)}
                      >
                        {promo.is_active ? (
                          <ToggleRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deletePromoCode(promo.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredPromoCodes.length === 0 && (
            <div className="py-12 text-center text-gray-500">
              No promo codes found. Create your first promo code to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
