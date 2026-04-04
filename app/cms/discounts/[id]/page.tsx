'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import Link from 'next/link'

interface DiscountProduct {
  id: string
  product_id: string
  variant_id?: string
  product_name: string
  variant_name?: string
  original_price: number
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  discounted_price: number
  promo_stock?: number
  min_purchase?: number
  is_active: boolean
  image_url?: string
  stock?: number
}

export default function EditDiscountPage() {
  const params = useParams()
  const router = useRouter()
  const discountId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    is_active: true
  })
  const [discountProducts, setDiscountProducts] = useState<DiscountProduct[]>([])
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [bulkDiscount, setBulkDiscount] = useState({ type: 'percentage' as 'percentage' | 'fixed', value: 0, promo_stock: '', min_purchase: '' })
  const [products, setProducts] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [tempSelectedProducts, setTempSelectedProducts] = useState<Set<string>>(new Set())

  const updateDiscountProduct = (index: number, field: string, value: any) => {
    setDiscountProducts(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const applyBulkDiscount = () => {
    const selected = Array.from(selectedProducts)
    if (selected.length === 0) {
      toast.error('Please select products to apply bulk discount')
      return
    }

    setDiscountProducts(prev => prev.map(product => {
      const key = product.variant_id ? `${product.product_id}-${product.variant_id}` : product.product_id
      if (selected.includes(key)) {
        const updatedProduct = { ...product, discount_type: bulkDiscount.type, discount_value: bulkDiscount.value }
        if (bulkDiscount.promo_stock) updatedProduct.promo_stock = parseInt(bulkDiscount.promo_stock)
        if (bulkDiscount.min_purchase) updatedProduct.min_purchase = parseInt(bulkDiscount.min_purchase)
        
        if (updatedProduct.discount_type === 'percentage') {
          updatedProduct.discounted_price = updatedProduct.original_price * (1 - updatedProduct.discount_value / 100)
        } else {
          updatedProduct.discounted_price = updatedProduct.original_price - updatedProduct.discount_value
        }
        return updatedProduct
      }
      return product
    }))
    toast.success(`Bulk discount applied to ${selected.length} items`)
  }

  const deleteSelected = () => {
    const selected = Array.from(selectedProducts)
    setDiscountProducts(prev => prev.filter(product => {
      const key = product.variant_id ? `${product.product_id}-${product.variant_id}` : product.product_id
      return !selected.includes(key)
    }))
    setSelectedProducts(new Set())
    toast.success(`Deleted ${selected.length} items`)
  }


  useEffect(() => {
    fetchDiscount()
    fetchProducts()
  }, [discountId])

  // Initialize all products with variants into discountProducts on load
  useEffect(() => {
    if (products.length > 0 && discountProducts.length === 0) {
      const allProducts: DiscountProduct[] = []
      
      products.forEach(product => {
        if (product.variants && product.variants.length > 0) {
          product.variants.forEach((variant: any) => {
            allProducts.push({
              id: '',
              product_id: product.id,
              product_name: product.name,
              variant_id: variant.name,
              variant_name: variant.name,
              original_price: variant.price_idr,
              discount_type: 'percentage',
              discount_value: 0,
              discounted_price: variant.price_idr,
              promo_stock: variant.stock_quantity,
              stock: variant.stock_quantity,
              min_purchase: 1,
              is_active: true,
              image_url: product.image_urls?.[0] || product.image_url,
            })
          })
        } else {
          allProducts.push({
            id: '',
            product_id: product.id,
            product_name: product.name,
            variant_id: undefined,
            variant_name: undefined,
            original_price: product.price_idr,
            discount_type: 'percentage',
            discount_value: 0,
            discounted_price: product.price_idr,
            promo_stock: product.stock_quantity,
            stock: product.stock_quantity,
            min_purchase: 1,
            is_active: true,
            image_url: product.image_urls?.[0] || product.image_url,
          })
        }
      })
      
      setDiscountProducts(allProducts)
    }
  }, [products])

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products/admin')
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
        
        // Check if we have existing discount products stored
        const existingDiscounts = (window as any).__existingDiscountProducts
        if (existingDiscounts) {
          mergeProductsWithExisting(data, existingDiscounts)
          delete (window as any).__existingDiscountProducts
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const fetchDiscount = async () => {
    try {
      const response = await fetch(`/api/discounts/${discountId}`)
      if (response.ok) {
        const data = await response.json()
        const startDate = data.start_date ? new Date(data.start_date) : null
        const endDate = data.end_date ? new Date(data.end_date) : null
        
        setFormData({
          name: data.name,
          start_date: startDate ? new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '',
          end_date: endDate ? new Date(endDate.getTime() - endDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '',
          is_active: data.is_active ?? true
        })
        
        // Store existing discount products to merge with all products later
        const existingDiscountProducts = data.discount_products || []
        
        // Pre-select existing products
        const existingKeys = existingDiscountProducts.map((dp: any) => 
          dp.variant_id ? `${dp.product_id}-${dp.variant_id}` : dp.product_id
        )
        setSelectedProducts(new Set(existingKeys))
        
        // We'll merge with all products in the useEffect
        if (products.length > 0) {
          mergeProductsWithExisting(products, existingDiscountProducts)
        } else {
          // Store temporarily until products are loaded
          ;(window as any).__existingDiscountProducts = existingDiscountProducts
        }
      } else {
        toast.error('Failed to load discount')
        router.push('/cms/discounts')
      }
    } catch (error) {
      console.error('Error fetching discount:', error)
      toast.error('Error loading discount')
    } finally {
      setLoading(false)
    }
  }

  const mergeProductsWithExisting = (allProducts: any[], existingDiscounts: any[]) => {
    const merged: DiscountProduct[] = []
    
    allProducts.forEach(product => {
      if (product.variants && product.variants.length > 0) {
        product.variants.forEach((variant: any) => {
          const existing = existingDiscounts.find(
            (ed: any) => ed.product_id === product.id && ed.variant_id === variant.name
          )
          
          merged.push({
            id: existing?.id || '',
            product_id: product.id,
            product_name: product.name,
            variant_id: variant.name,
            variant_name: variant.name,
            original_price: existing?.original_price || variant.price_idr,
            discount_type: existing?.discount_type || 'percentage',
            discount_value: existing?.discount_value || 0,
            discounted_price: existing?.discounted_price || variant.price_idr,
            promo_stock: existing?.promo_stock || variant.stock_quantity,
            stock: variant.stock_quantity,
            min_purchase: existing?.min_purchase || 1,
            is_active: existing?.is_active ?? true,
            image_url: product.image_urls?.[0] || product.image_url,
          })
        })
      } else {
        const existing = existingDiscounts.find(
          (ed: any) => ed.product_id === product.id && !ed.variant_id
        )
        
        merged.push({
          id: existing?.id || '',
          product_id: product.id,
          product_name: product.name,
          variant_id: undefined,
          variant_name: undefined,
          original_price: existing?.original_price || product.price_idr,
          discount_type: existing?.discount_type || 'percentage',
          discount_value: existing?.discount_value || 0,
          discounted_price: existing?.discounted_price || product.price_idr,
          promo_stock: existing?.promo_stock || product.stock_quantity,
          stock: product.stock_quantity,
          min_purchase: existing?.min_purchase || 1,
          is_active: existing?.is_active ?? true,
          image_url: product.image_urls?.[0] || product.image_url,
        })
      }
    })
    
    setDiscountProducts(merged)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Only send selected products
      const selectedProductsData = discountProducts.filter(product => {
        const key = product.variant_id ? `${product.product_id}-${product.variant_id}` : product.product_id
        return selectedProducts.has(key)
      })

      const response = await fetch(`/api/discounts/${discountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          start_date: formData.start_date,
          end_date: formData.end_date,
          is_active: formData.is_active,
          products: selectedProductsData
        })
      })

      if (response.ok) {
        toast.success('Discount updated successfully')
        router.push('/cms/discounts')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update discount')
      }
    } catch (error) {
      console.error('Error updating discount:', error)
      toast.error('Error updating discount')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-luxury-navy"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/cms/discounts">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Discount</h1>
              <p className="text-sm text-gray-500">Update discount campaign details</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/cms/discounts">
              <Button variant="outline" size="sm">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </Link>
            <Button onClick={handleSubmit} disabled={saving} size="sm">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-luxury-gold focus:ring-luxury-gold"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Active
                </label>
              </div>
            </div>
          </div>

          {/* Products in Discount */}
          <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Produk dalam Promo Toko</h2>
            </div>

            <div className="text-sm text-gray-600 mb-4">
              {new Set(discountProducts.map(p => p.product_id)).size} total produk
            </div>

            {/* Bulk Discount Options */}
            {discountProducts.length > 0 && selectedProducts.size > 0 && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Perubahan massal ({selectedProducts.size} produk dipilih)</h3>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={applyBulkDiscount} className="bg-luxury-gold hover:bg-luxury-gold/90">
                      Ubah Semua
                    </Button>
                    <Button type="button" size="sm" variant="destructive" onClick={deleteSelected}>
                      Hapus
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Harga Diskon (Rp)</label>
                    <input
                      type="number"
                      value={bulkDiscount.value}
                      onChange={(e) => setBulkDiscount(prev => ({ ...prev, value: parseFloat(e.target.value) || 0, type: 'fixed' }))}
                      placeholder="Masukkan harga diskon"
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Stok Promosi</label>
                    <input
                      type="number"
                      value={bulkDiscount.promo_stock}
                      onChange={(e) => setBulkDiscount(prev => ({ ...prev, promo_stock: e.target.value }))}
                      placeholder="Tidak ada"
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                      min="0"
                    />
                  </div>
                </div>
              </div>
            )}
            
            {discountProducts.length > 0 && (
              <div className="space-y-0 border border-gray-200 rounded-lg overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <div className="col-span-1 flex items-center">
                    <input
                      type="checkbox"
                      ref={(el) => {
                        if (el) {
                          el.indeterminate = selectedProducts.size > 0 && selectedProducts.size < discountProducts.length
                        }
                      }}
                      checked={selectedProducts.size > 0 && selectedProducts.size === discountProducts.length}
                      onChange={() => {
                        if (selectedProducts.size > 0) {
                          setSelectedProducts(new Set())
                        } else {
                          const allKeys = discountProducts.map(p => p.variant_id ? `${p.product_id}-${p.variant_id}` : p.product_id)
                          setSelectedProducts(new Set(allKeys))
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-luxury-gold focus:ring-luxury-gold"
                    />
                  </div>
                  <div className="col-span-1">Nama Produk</div>
                  <div className="col-span-1">Harga Awal</div>
                  <div className="col-span-2 text-center">Harga Diskon</div>
                  <div className="col-span-1 text-center">% Diskon</div>
                  <div className="col-span-1 text-center">Stok</div>
                  <div className="col-span-1 text-center">Stok Promosi</div>
                  <div className="col-span-1 text-center">Batas Pembelian</div>
                  <div className="col-span-1 text-center">Aktifkan / Nonaktifkan</div>
                  <div className="col-span-1 text-right">Aksi</div>
                </div>

                {/* Product Rows */}
                {(() => {
                  const groupedProducts: { [key: string]: DiscountProduct[] } = {}
                  discountProducts.forEach(item => {
                    if (!groupedProducts[item.product_id]) {
                      groupedProducts[item.product_id] = []
                    }
                    groupedProducts[item.product_id].push(item)
                  })

                  return Object.entries(groupedProducts).map(([productId, items]) => {
                    return (
                      <div key={productId} className="border-b border-gray-200 last:border-b-0">
                        {/* Product Header */}
                        <div className="px-4 py-3 bg-white flex items-center justify-between border-b border-gray-100">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              ref={(el) => {
                                if (el) {
                                  const keys = items.map(item => item.variant_id ? `${item.product_id}-${item.variant_id}` : item.product_id)
                                  const selectedCount = keys.filter(k => selectedProducts.has(k)).length
                                  el.indeterminate = selectedCount > 0 && selectedCount < keys.length
                                }
                              }}
                              checked={items.every(item => {
                                const key = item.variant_id ? `${item.product_id}-${item.variant_id}` : item.product_id
                                return selectedProducts.has(key)
                              })}
                              onChange={() => {
                                const keys = items.map(item => item.variant_id ? `${item.product_id}-${item.variant_id}` : item.product_id)
                                const allSelected = keys.every(k => selectedProducts.has(k))
                                setSelectedProducts(prev => {
                                  const newSet = new Set(prev)
                                  keys.forEach(k => allSelected ? newSet.delete(k) : newSet.add(k))
                                  return newSet
                                })
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-luxury-gold focus:ring-luxury-gold"
                            />
                            {items[0].image_url && (
                              <img src={items[0].image_url} alt={items[0].product_name} className="h-12 w-12 rounded object-cover border border-gray-200" />
                            )}
                            <span className="text-sm font-medium text-gray-900">{items[0].product_name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                setDiscountProducts(prev => prev.filter(p => p.product_id !== productId))
                              }}
                              className="text-red-500 hover:text-red-600 text-sm font-medium"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>

                        {/* Variant Rows */}
                        {items.map((item, idx) => {
                          const globalIndex = discountProducts.findIndex(p => 
                            p.product_id === item.product_id &&
                            (item.variant_id ? p.variant_id === item.variant_id : !p.variant_id)
                          )
                          const originalPrice = item.original_price || 0
                          const discountedPrice = item.discounted_price || 0
                          const discountPercent = originalPrice > 0 
                            ? Math.round(((originalPrice - discountedPrice) / originalPrice) * 100)
                            : 0
                          
                          return (
                            <div key={idx} className="grid grid-cols-12 gap-2 items-center px-4 py-3 bg-white hover:bg-gray-50">
                              {/* Empty space for alignment (no checkbox on variants) */}
                              <div className="col-span-1 flex items-center pl-4">
                              </div>
                              {/* Variant Name */}
                              <div className="col-span-1">
                                {item.variant_name && (
                                  <span className="text-gray-600">{item.variant_name}</span>
                                )}
                                {!item.variant_name && (
                                  <span className="text-gray-400 text-xs">No variant</span>
                                )}
                              </div>
                              {/* Original Price */}
                              <div className="col-span-1 text-sm text-gray-700">
                                Rp{originalPrice.toLocaleString('id-ID')}
                              </div>
                              {/* Discount Price (Rp input) */}
                              <div className="col-span-2">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-500">Rp</span>
                                  <input
                                    type="text"
                                    defaultValue={Math.round(discountedPrice).toLocaleString('id-ID')}
                                    onChange={(e) => {
                                      const rawValue = e.target.value.replace(/\./g, '')
                                      const val = parseFloat(rawValue) || 0
                                      const newDiscountedPrice = Math.max(0, Math.min(val, originalPrice))
                                      updateDiscountProduct(globalIndex, 'discounted_price', newDiscountedPrice)
                                    }}
                                    onBlur={(e) => {
                                      const rawValue = e.target.value.replace(/\./g, '')
                                      const val = parseFloat(rawValue) || 0
                                      e.target.value = Math.round(val).toLocaleString('id-ID')
                                    }}
                                    className="w-28 rounded border border-blue-400 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                              </div>
                              <div className="col-span-1 flex items-center justify-center">
                                <div className="rounded border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-center text-gray-700 font-medium">
                                  {discountPercent}%
                                </div>
                              </div>
                              <div className="col-span-1 flex items-center justify-center text-sm text-gray-700">
                                {item.stock || 0}
                              </div>
                              <div className="col-span-1">
                                <select
                                  value={item.promo_stock?.toString() || ''}
                                  onChange={(e) => updateDiscountProduct(globalIndex, 'promo_stock', e.target.value ? parseInt(e.target.value) : undefined)}
                                  className="w-full rounded border border-gray-300 px-1 py-1 text-xs"
                                >
                                  <option value="">Tidak ada</option>
                                  <option value="10">10</option>
                                  <option value="25">25</option>
                                  <option value="50">50</option>
                                  <option value="100">100</option>
                                </select>
                              </div>
                              <div className="col-span-1">
                                <select
                                  value={item.min_purchase?.toString() || ''}
                                  onChange={(e) => updateDiscountProduct(globalIndex, 'min_purchase', e.target.value ? parseInt(e.target.value) : undefined)}
                                  className="w-full rounded border border-gray-300 px-1 py-1 text-xs"
                                >
                                  <option value="">Tidak ada</option>
                                  <option value="1">1</option>
                                  <option value="2">2</option>
                                  <option value="3">3</option>
                                  <option value="5">5</option>
                                </select>
                              </div>
                              <div className="col-span-1 flex justify-center">
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={item.is_active}
                                    onChange={(e) => updateDiscountProduct(globalIndex, 'is_active', e.target.checked)}
                                  />
                                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                                </label>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })
                })()}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
