'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, Edit, Trash2, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Discount {
  id: string
  name: string
  start_date: string
  end_date: string
  product_count: number
  status: 'active' | 'scheduled' | 'expired'
  created_at: string
}

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchDiscounts()
  }, [])

  const fetchDiscounts = async () => {
    try {
      const response = await fetch('/api/discounts')
      if (response.ok) {
        const data = await response.json()
        setDiscounts(data)
      }
    } catch (error) {
      console.error('Error fetching discounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteDiscount = async (discountId: string, discountName: string) => {
    try {
      const response = await fetch(`/api/discounts/${discountId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        toast.success('Discount deleted', {
          description: `"${discountName}" has been removed`
        })
        fetchDiscounts()
      } else {
        toast.error('Failed to delete discount')
      }
    } catch (error) {
      console.error('Error deleting discount:', error)
      toast.error('An error occurred')
    }
  }

  const filteredDiscounts = discounts.filter(discount =>
    discount.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      scheduled: 'bg-blue-100 text-blue-800',
      expired: 'bg-gray-100 text-gray-800'
    }
    return styles[status as keyof typeof styles] || styles.expired
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Discounts</h1>
          <p className="mt-2 text-gray-600">Manage product discounts and promotions</p>
        </div>
        <Link href="/cms/discounts/new">
          <Button className="bg-luxury-gold text-luxury-navy hover:bg-luxury-gold/90">
            <Plus className="mr-2 h-4 w-4" />
            Create Discount
          </Button>
        </Link>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search discounts..."
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
                <th className="pb-3">Discount Name</th>
                <th className="pb-3">Period</th>
                <th className="pb-3">Products</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : filteredDiscounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    No discounts found. Create your first discount to get started.
                  </td>
                </tr>
              ) : (
                filteredDiscounts.map((discount) => (
                  <tr key={discount.id} className="text-sm">
                    <td className="py-4">
                      <div className="font-medium text-gray-900">{discount.name}</div>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2 text-gray-600 text-xs">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {new Date(discount.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}, {new Date(discount.start_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })} - {new Date(discount.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}, {new Date(discount.end_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 text-gray-900">
                      {discount.product_count} products
                    </td>
                    <td className="py-4">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusBadge(discount.status)}`}>
                        {discount.status ? discount.status.charAt(0).toUpperCase() + discount.status.slice(1) : 'Unknown'}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <Link href={`/cms/discounts/${discount.id}`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            toast.error(`Delete "${discount.name}"?`, {
                              description: 'This action cannot be undone.',
                              action: {
                                label: 'Delete',
                                onClick: () => deleteDiscount(discount.id, discount.name),
                              },
                            })
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
