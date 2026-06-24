'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'

interface Product {
  id: string
  name: string
  slug: string
  price_usd: number
  price_idr: number
  stock_quantity: number
  image_url?: string
  image_urls?: string[]
  variants?: Array<{
    id: string
    name: string
    sku: string
    price_usd: number
    price_idr: number
    stock_quantity: number
  }>
}

interface DiscountProduct {
  product_id: string
  product_name: string
  variant_id?: string
  variant_name?: string
  original_price: number
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  discounted_price: number
  promo_stock?: number
  stock: number
  min_purchase?: number
  is_active: boolean
  image_url?: string
}

export default function NewDiscountPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [tempSelectedProducts, setTempSelectedProducts] = useState<Set<string>>(new Set())
  
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
  })
  
  const [discountProducts, setDiscountProducts] = useState<DiscountProduct[]>([])
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [bulkDiscount, setBulkDiscount] = useState({ type: 'percentage' as 'percentage' | 'fixed', value: 0, promo_stock: '', min_purchase: '' })

  // Debug: Log discount products state changes
  useEffect(() => {
    if (discountProducts.length > 0) {
      console.log('📊 Current Discount Products State:', discountProducts.map((p, idx) => ({
        index: idx,
        product_id: p.product_id,
        variant_id: p.variant_id,
        variant_name: p.variant_name,
        original_price: p.original_price,
        discounted_price: p.discounted_price,
        discount_value: p.discount_value,
        discount_percent: p.original_price > 0 ? Math.round(((p.original_price - p.discounted_price) / p.original_price) * 100) : 0
      })))
    }
  }, [discountProducts])

  useEffect(() => {
    fetchProducts()
  }, [])

  const [showProductSearch, setShowProductSearch] = useState(false)

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products/admin')
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const addSelectedProducts = () => {
    const selected = Array.from(tempSelectedProducts)
    if (selected.length === 0) {
      return // Silently return if nothing selected
    }

    const newProducts: DiscountProduct[] = []
    
    selected.forEach(productId => {
      const product = products.find(p => p.id === productId)
      if (!product) return

      // Check for duplicates
      const isDuplicate = discountProducts.some(dp => dp.product_id === product.id)
      if (isDuplicate) return

      // If product has variants, add all variants
      if (product.variants && product.variants.length > 0) {
        const variantProducts: DiscountProduct[] = product.variants.map((variant) => ({
          product_id: product.id,
          product_name: product.name,
          variant_id: variant.name,
          variant_name: variant.name,
          original_price: variant.price_usd,
          discount_type: 'percentage',
          discount_value: 0,
          discounted_price: variant.price_usd,
          promo_stock: variant.stock_quantity,
          stock: variant.stock_quantity,
          min_purchase: 1,
          is_active: true,
          image_url: product.image_urls?.[0] || product.image_url,
        }))
        newProducts.push(...variantProducts)
      } else {
        // Add product without variants
        const newProduct: DiscountProduct = {
          product_id: product.id,
          product_name: product.name,
          variant_id: undefined,
          variant_name: undefined,
          original_price: product.price_usd,
          discount_type: 'percentage',
          discount_value: 0,
          discounted_price: product.price_usd,
          promo_stock: product.stock_quantity,
          stock: product.stock_quantity,
          min_purchase: 1,
          is_active: true,
          image_url: product.image_urls?.[0] || product.image_url,
        }
        newProducts.push(newProduct)
      }
    })

    setDiscountProducts(prev => [...prev, ...newProducts])
    setTempSelectedProducts(new Set())
    toast.success(`Added ${selected.length} products`)
  }

  const removeProduct = (index: number) => {
    setDiscountProducts(prev => prev.filter((_, i) => i !== index))
  }

  const updateDiscountProduct = (index: number, field: string, value: any) => {
    setDiscountProducts(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      
      // Recalculate discounted price
      if (field === 'discount_type' || field === 'discount_value') {
        const product = updated[index]
        if (product.discount_type === 'percentage') {
          product.discounted_price = product.original_price * (1 - product.discount_value / 100)
        } else {
          product.discounted_price = product.original_price - product.discount_value
        }
      }
      
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
        
        // Recalculate price
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

  const toggleSelection = (productId: string, variantId?: string) => {
    const key = variantId ? `${productId}-${variantId}` : productId
    setSelectedProducts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(key)) {
        newSet.delete(key)
      } else {
        newSet.add(key)
      }
      return newSet
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast.error('Authentication required')
        return
      }

      // Treat datetime-local as Jakarta time (UTC+7) before storing
      const startDateUTC = new Date(formData.start_date + ':00+07:00').toISOString()
      const endDateUTC = new Date(formData.end_date + ':00+07:00').toISOString()

      console.log('📤 Submitting Discount Campaign:', {
        name: formData.name,
        start_date: startDateUTC,
        end_date: endDateUTC,
        total_products: discountProducts.length,
        products: discountProducts.map((p, idx) => ({
          index: idx,
          product_id: p.product_id,
          variant_id: p.variant_id,
          variant_name: p.variant_name,
          original_price: p.original_price,
          discounted_price: p.discounted_price,
          discount_value: p.discount_value,
          discount_type: p.discount_type,
          discount_percent: Math.round(((p.original_price - p.discounted_price) / p.original_price) * 100),
          promo_stock: p.promo_stock,
          min_purchase: p.min_purchase,
          is_active: p.is_active
        }))
      })

      const response = await fetch('/api/discounts', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          start_date: startDateUTC,
          end_date: endDateUTC,
          products: discountProducts,
        })
      })

      if (response.ok) {
        toast.success('Discount created successfully')
        router.push('/cms/discounts')
      } else {
        const errorData = await response.json()
        toast.error('Failed to create discount', {
          description: errorData.error || 'Unknown error'
        })
      }
    } catch (error: any) {
      console.error('Error creating discount:', error)
      toast.error('An error occurred', {
        description: error.message || 'Please try again'
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="mb-4 sm:mb-6 flex items-center gap-2 sm:gap-4">
        <Link href="/cms/discounts">
          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Discount</h1>
          <p className="text-sm text-gray-600">Set up a new discount campaign</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Discount Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                maxLength={150}
                placeholder="Internal name (not shown to customers)"
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
              />
              <p className="mt-1 text-xs text-gray-500">{formData.name.length}/150</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Start Date (Jakarta time)
                </label>
                <input
                  type="datetime-local"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  End Date (Jakarta time)
                </label>
                <input
                  type="datetime-local"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Products in Discount */}
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Products in Discount</h2>
            <Button type="button" size="sm" className="bg-luxury-gold hover:bg-luxury-gold/90" onClick={() => setShowProductSearch(v => !v)}>
              + Add Products
            </Button>
          </div>

          {/* Product search/select panel */}
          {showProductSearch && (
            <div className="mb-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:border-luxury-gold"
                />
              </div>
              {/* Select All */}
              {(() => {
                const available = filteredProducts.filter(p => !discountProducts.some(dp => dp.product_id === p.id))
                const allSelected = available.length > 0 && available.every(p => tempSelectedProducts.has(p.id))
                return available.length > 0 ? (
                  <label className="flex items-center gap-2 px-3 py-2 mb-1 rounded-lg cursor-pointer border-b border-gray-200">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => {
                        setTempSelectedProducts(prev => {
                          const next = new Set(prev)
                          if (allSelected) {
                            available.forEach(p => next.delete(p.id))
                          } else {
                            available.forEach(p => next.add(p.id))
                          }
                          return next
                        })
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-luxury-gold"
                    />
                    <span className="text-sm font-medium text-gray-700">Select All ({available.length})</span>
                  </label>
                ) : null
              })()}
              <div className="max-h-48 overflow-y-auto space-y-1 mb-3">
                {filteredProducts.filter(p => !discountProducts.some(dp => dp.product_id === p.id)).map(product => (
                  <label key={product.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tempSelectedProducts.has(product.id)}
                      onChange={() => {
                        setTempSelectedProducts(prev => {
                          const next = new Set(prev)
                          next.has(product.id) ? next.delete(product.id) : next.add(product.id)
                          return next
                        })
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-luxury-gold"
                    />
                    {(product.image_urls?.[0] || product.image_url) && (
                      <img src={product.image_urls?.[0] || product.image_url} alt={product.name} className="h-8 w-8 rounded object-cover" />
                    )}
                    <span className="text-sm text-gray-900">{product.name}</span>
                    <span className="ml-auto text-xs text-gray-500">${product.price_usd?.toFixed(2)}</span>
                  </label>
                ))}
                {filteredProducts.filter(p => !discountProducts.some(dp => dp.product_id === p.id)).length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">All products already added</p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => { setShowProductSearch(false); setTempSelectedProducts(new Set()); setSearchQuery('') }}>
                  Close
                </Button>
                <Button type="button" size="sm" className="bg-luxury-gold hover:bg-luxury-gold/90" onClick={() => { addSelectedProducts(); setShowProductSearch(false); setSearchQuery('') }} disabled={tempSelectedProducts.size === 0}>
                  Add {tempSelectedProducts.size > 0 ? `(${tempSelectedProducts.size})` : ''}
                </Button>
              </div>
            </div>
          )}

          <div className="text-sm text-gray-600 mb-4">
            {new Set(discountProducts.map(p => p.product_id)).size} products added
          </div>

          {/* Bulk Discount Options */}
          {discountProducts.length > 0 && selectedProducts.size > 0 && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Bulk changes ({selectedProducts.size} selected)</h3>
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={applyBulkDiscount} className="bg-luxury-gold hover:bg-luxury-gold/90">
                    Apply to All
                  </Button>
                  <Button type="button" size="sm" variant="destructive" onClick={deleteSelected}>
                    Delete
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Discount Price (USD)</label>
                  <input
                    type="number"
                    value={bulkDiscount.value}
                    onChange={(e) => setBulkDiscount(prev => ({ ...prev, value: parseFloat(e.target.value) || 0, type: 'fixed' }))}
                    placeholder="Enter discount price"
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Promo Stock</label>
                  <input
                    type="number"
                    value={bulkDiscount.promo_stock}
                    onChange={(e) => setBulkDiscount(prev => ({ ...prev, promo_stock: e.target.value }))}
                    placeholder="None"
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    min="0"
                  />
                </div>
              </div>
            </div>
          )}

          {discountProducts.length === 0 && (
            <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-lg">
              <p className="text-sm">No products added yet.</p>
              <p className="text-xs mt-1">Click <strong>+ Add Products</strong> to select which products to discount.</p>
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
                <div className="col-span-1">Product Name</div>
                <div className="col-span-1">Original Price</div>
                <div className="col-span-2 text-center">Discount Price</div>
                <div className="col-span-1 text-center">% Off</div>
                <div className="col-span-1 text-center">Stock</div>
                <div className="col-span-1 text-center">Promo Stock</div>
                <div className="col-span-1 text-center">Purchase Limit</div>
                <div className="col-span-1 text-center">Active</div>
                <div className="col-span-1 text-right">Action</div>
              </div>

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
                            Remove
                          </button>
                        </div>
                      </div>

                      {/* Variant / Product Rows - Always expanded */}
                      <div className="divide-y divide-gray-100">
                        {items.map((item, idx) => {
                          const globalIndex = discountProducts.findIndex(p => {
                            const matches = p.product_id === item.product_id &&
                              (item.variant_id ? p.variant_id === item.variant_id : !p.variant_id)
                            console.log(`🔍 Finding index for ${item.variant_name}:`, {
                              searching_for: { product_id: item.product_id, variant_id: item.variant_id },
                              comparing_with: { product_id: p.product_id, variant_id: p.variant_id },
                              matches
                            })
                            return matches
                          })
                          console.log(`📍 GlobalIndex for ${item.variant_name}: ${globalIndex}`)
                          const itemKey = item.variant_id ? `${item.product_id}-${item.variant_id}` : item.product_id
                          const isSelected = selectedProducts.has(itemKey)
                          // Calculate % discount as: ((original_price - discounted_price) / original_price) * 100
                          const discountPercent = item.original_price > 0 ? Math.round(((item.original_price - item.discounted_price) / item.original_price) * 100) : 0
                          return (
                            <div key={idx} className="grid grid-cols-12 gap-2 items-center px-4 py-3 bg-white hover:bg-gray-50">
                              {/* Empty space for alignment (no checkbox on variants) */}
                              <div className="col-span-1 flex items-center pl-4">
                              </div>
                              {/* Variant Name */}
                              <div className="col-span-1">
                                <span className="text-sm text-gray-900">{item.variant_name || '-'}</span>
                                {item.stock === 0 && <span className="text-xs text-red-500">Out of stock</span>}
                              </div>
                              {/* Original Price */}
                              <div className="col-span-1 text-sm text-gray-700">
                                ${item.original_price.toFixed(2)}
                              </div>
                              {/* Discount Price (USD input) */}
                              <div className="col-span-2">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-500">$</span>
                                  <input
                                    key={`discount-${globalIndex}-${item.product_id}-${item.variant_id || 'no-variant'}`}
                                    type="text"
                                    defaultValue={item.discounted_price.toFixed(2)}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0
                                      const currentOriginalPrice = item.original_price
                                      const newDiscountedPrice = Math.max(0, Math.min(val, currentOriginalPrice))
                                      
                                      console.log('🔄 Discount Input Change:', {
                                        globalIndex,
                                        product_id: item.product_id,
                                        variant_id: item.variant_id,
                                        variant_name: item.variant_name,
                                        original_price: currentOriginalPrice,
                                        input_value: val,
                                        new_discounted_price: newDiscountedPrice,
                                        discount_value: currentOriginalPrice - newDiscountedPrice,
                                        discount_percent: Math.round(((currentOriginalPrice - newDiscountedPrice) / currentOriginalPrice) * 100)
                                      })
                                      
                                      setDiscountProducts(prev => {
                                        const updated = [...prev]
                                        const oldItem = updated[globalIndex]
                                        updated[globalIndex] = {
                                          ...oldItem,
                                          discounted_price: newDiscountedPrice,
                                          discount_value: oldItem.original_price - newDiscountedPrice,
                                          discount_type: 'fixed'
                                        }
                                        console.log('✅ Updated discount product:', updated[globalIndex])
                                        return updated
                                      })
                                    }}
                                    onBlur={(e) => {
                                      const val = parseFloat(e.target.value) || 0
                                      e.target.value = val.toFixed(2)
                                    }}
                                    className="w-28 rounded border border-blue-400 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                              </div>
                              {/* Discount % (auto-calculated, read-only display) */}
                              <div className="col-span-1">
                                <div className="flex items-center justify-center gap-1">
                                  <div className="rounded border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-center text-gray-700 font-medium">
                                    {discountPercent}%
                                  </div>
                                </div>
                              </div>
                              {/* Stock */}
                              <div className="col-span-1 text-sm text-gray-700 text-center">{item.stock}</div>
                              {/* Promo Stock */}
                              <div className="col-span-1">
                                <select
                                  value={item.promo_stock?.toString() || ''}
                                  onChange={(e) => updateDiscountProduct(globalIndex, 'promo_stock', e.target.value ? parseInt(e.target.value) : undefined)}
                                  className="w-full rounded border border-gray-300 px-1 py-1 text-xs"
                                >
                                  <option value="">None</option>
                                  <option value="10">10</option>
                                  <option value="25">25</option>
                                  <option value="50">50</option>
                                  <option value="100">100</option>
                                </select>
                              </div>
                              {/* Purchase Limit */}
                              <div className="col-span-1">
                                <select
                                  value={item.min_purchase?.toString() || ''}
                                  onChange={(e) => updateDiscountProduct(globalIndex, 'min_purchase', e.target.value ? parseInt(e.target.value) : undefined)}
                                  className="w-full rounded border border-gray-300 px-1 py-1 text-xs"
                                >
                                  <option value="">None</option>
                                  <option value="1">1</option>
                                  <option value="2">2</option>
                                  <option value="3">3</option>
                                  <option value="5">5</option>
                                </select>
                              </div>
                              {/* Active/Inactive Toggle */}
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
                    </div>
                  )
                })
              })()}
            </div>
          )}
        </div>

        {/* Submit Buttons - sticky */}
        <div className="sticky bottom-0 z-10 flex items-center justify-end gap-4 bg-gray-50 border-t border-gray-200 px-6 py-4 -mx-6">
          <Link href="/cms/discounts">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={loading || discountProducts.length === 0}
            className="bg-luxury-gold hover:bg-luxury-gold/90"
          >
            {loading ? 'Creating...' : 'Create Discount'}
          </Button>
        </div>
      </form>
    </div>
  )
}
