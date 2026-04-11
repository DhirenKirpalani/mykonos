'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, Edit, Trash2, Calendar, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Discount {
  id: string
  name: string
  start_date: string
  end_date: string
  product_count: number
  status: 'active' | 'scheduled' | 'expired'
  is_active: boolean
  created_at: string
  products?: Array<{
    id: string
    name: string
    image_url?: string
  }>
}

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedDiscounts, setExpandedDiscounts] = useState<Set<string>>(new Set())
  const [discountDetails, setDiscountDetails] = useState<Map<string, any[]>>(new Map())

  const toggleExpand = async (discountId: string) => {
    const newExpanded = new Set(expandedDiscounts)
    if (newExpanded.has(discountId)) {
      newExpanded.delete(discountId)
    } else {
      newExpanded.add(discountId)
      // Fetch detailed discount products if not already loaded
      if (!discountDetails.has(discountId)) {
        await fetchDiscountDetails(discountId)
      }
    }
    setExpandedDiscounts(newExpanded)
  }

  const fetchDiscountDetails = async (discountId: string) => {
    try {
      const response = await fetch(`/api/discounts/${discountId}/products`)
      if (response.ok) {
        const data = await response.json()
        setDiscountDetails(prev => new Map(prev).set(discountId, data))
      }
    } catch (error) {
      console.error('Error fetching discount details:', error)
    }
  }

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

  const duplicateDiscount = async (discountId: string, discountName: string) => {
    try {
      const response = await fetch(`/api/discounts/${discountId}/duplicate`, {
        method: 'POST',
      })
      
      if (response.ok) {
        toast.success('Discount duplicated', {
          description: `"${discountName}" has been copied`
        })
        fetchDiscounts()
      } else {
        toast.error('Failed to duplicate discount')
      }
    } catch (error) {
      console.error('Error duplicating discount:', error)
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
                  <>
                  <tr key={discount.id} className="text-sm hover:bg-gray-50 cursor-pointer" onClick={() => toggleExpand(discount.id)}>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <button className="text-gray-400 hover:text-gray-600">
                          {expandedDiscounts.has(discount.id) ? (
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          ) : (
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </button>
                        <div className="font-medium text-gray-900">{discount.name}</div>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2 text-gray-600 text-xs">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {new Date(discount.start_date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}, {new Date(discount.start_date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })} - {new Date(discount.end_date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}, {new Date(discount.end_date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </span>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-gray-900">{discount.products?.length || 0} products</span>
                        {discount.products && discount.products.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {discount.products.slice(0, 3).map((product) => (
                              <div key={product.id} className="flex items-center gap-1.5 bg-gray-50 rounded px-2 py-1">
                                {product.image_url && (
                                  <img src={product.image_url} alt={product.name} className="h-6 w-6 rounded object-cover" />
                                )}
                                <span className="text-xs text-gray-700 truncate max-w-[120px]">{product.name}</span>
                              </div>
                            ))}
                            {discount.products.length > 3 && (
                              <span className="text-xs text-gray-500">+{discount.products.length - 3} more</span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          discount.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {discount.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {discount.status !== 'active' && (
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusBadge(discount.status)}`}>
                            {discount.status ? discount.status.charAt(0).toUpperCase() + discount.status.slice(1) : ''}
                          </span>
                        )}
                      </div>
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
                          onClick={(e) => {
                            e.stopPropagation()
                            duplicateDiscount(discount.id, discount.name)
                          }}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
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
                  {expandedDiscounts.has(discount.id) && (
                    <tr key={`${discount.id}-details`} className="bg-gray-50">
                      <td colSpan={5} className="px-4 py-4">
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-gray-100">
                              <tr className="text-xs font-medium text-gray-600">
                                <th className="px-4 py-2 text-left">Produk</th>
                                <th className="px-4 py-2 text-right">Harga Awal</th>
                                <th className="px-4 py-2 text-right">Harga Diskon</th>
                                <th className="px-4 py-2 text-center">% Diskon</th>
                                <th className="px-4 py-2 text-center">Stok</th>
                                <th className="px-4 py-2 text-center">Stok Promosi</th>
                                <th className="px-4 py-2 text-center">Min. Pembelian</th>
                                <th className="px-4 py-2 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {discountDetails.get(discount.id)?.map((product: any, idx: number) => (
                                <tr key={idx} className="text-sm">
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      {product.product_image && (
                                        <img src={product.product_image} alt={product.product_name} className="h-8 w-8 rounded object-cover" />
                                      )}
                                      <div>
                                        <div className="font-medium text-gray-900">{product.product_name}</div>
                                        {product.variant_name && (
                                          <div className="text-xs text-gray-500">{product.variant_name}</div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-right text-gray-900">Rp{product.original_price?.toLocaleString('id-ID') || '-'}</td>
                                  <td className="px-4 py-3 text-right font-medium text-green-600">Rp{product.discounted_price?.toLocaleString('id-ID') || '-'}</td>
                                  <td className="px-4 py-3 text-center">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      {product.original_price > 0 ? Math.round(((product.original_price - product.discounted_price) / product.original_price) * 100) : 0}%
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-center text-gray-600">{product.stock || '-'}</td>
                                  <td className="px-4 py-3 text-center text-gray-600">{product.promo_stock || '-'}</td>
                                  <td className="px-4 py-3 text-center text-gray-600">{product.min_purchase || '-'}</td>
                                  <td className="px-4 py-3 text-center">
                                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                      product.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                      {product.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                  </td>
                                </tr>
                              )) || (
                                <tr>
                                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                                    <p className="mt-2">Loading products...</p>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
