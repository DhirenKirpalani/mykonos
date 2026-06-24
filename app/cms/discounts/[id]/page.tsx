'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, Search, X } from 'lucide-react'
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
  const [showProductSearch, setShowProductSearch] = useState(false)

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

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

  const addSelectedProducts = () => {
    const selected = Array.from(tempSelectedProducts)
    if (selected.length === 0) return
    const newProducts: DiscountProduct[] = []
    selected.forEach(productId => {
      const product = products.find(p => p.id === productId)
      if (!product) return
      if (discountProducts.some(dp => dp.product_id === productId)) return
      if (product.variants && product.variants.length > 0) {
        product.variants.forEach((variant: any) => {
          newProducts.push({
            id: '',
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
          })
        })
      } else {
        newProducts.push({
          id: '',
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
        })
      }
    })
    setDiscountProducts(prev => [...prev, ...newProducts])
    setTempSelectedProducts(new Set())
    toast.success(`Added ${selected.length} products`)
  }

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

  // Convert UTC ISO string from DB to Jakarta local datetime-local value
  const utcToJakartaLocal = (utcStr: string) => {
    const d = new Date(utcStr)
    const jakartaMs = d.getTime() + 7 * 60 * 60 * 1000
    return new Date(jakartaMs).toISOString().slice(0, 16)
  }

  const fetchDiscount = async () => {
    try {
      const response = await fetch(`/api/discounts/${discountId}`)
      if (response.ok) {
        const data = await response.json()
        setFormData({
          name: data.name,
          start_date: data.start_date ? utcToJakartaLocal(data.start_date) : '',
          end_date: data.end_date ? utcToJakartaLocal(data.end_date) : '',
          is_active: data.is_active ?? true
        })

        // Load only the existing discounted products (not all 49)
        const existingDiscountProducts: DiscountProduct[] = (data.discount_products || []).map((dp: any) => {
          const productData = dp.products
          const originalPrice = dp.original_price ?? productData?.price_usd ?? 0
          const validImages = productData?.image_urls?.filter((u: string) => u && u.startsWith('http') && !u.includes('placehold.co')) || []
          return {
            id: dp.id || '',
            product_id: dp.product_id,
            product_name: productData?.name || '',
            variant_id: dp.variant_id || undefined,
            variant_name: dp.variant_id || undefined,
            original_price: originalPrice,
            discount_type: dp.discount_type || 'percentage',
            discount_value: dp.discount_value || 0,
            discounted_price: dp.discounted_price ?? originalPrice,
            promo_stock: dp.promo_stock ?? undefined,
            stock: 0,
            min_purchase: dp.min_purchase ?? 1,
            is_active: dp.is_active ?? true,
            image_url: validImages[0] || undefined,
          }
        })
        setDiscountProducts(existingDiscountProducts)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Treat datetime-local input as Jakarta time (UTC+7) before storing
      const startDateUTC = new Date(formData.start_date + ':00+07:00').toISOString()
      const endDateUTC = new Date(formData.end_date + ':00+07:00').toISOString()

      const response = await fetch(`/api/discounts/${discountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          start_date: startDateUTC,
          end_date: endDateUTC,
          is_active: formData.is_active,
          products: discountProducts
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
          {/* Basic Information */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Name *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date (Jakarta time) *</label>
                  <input
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date (Jakarta time) *</label>
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
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Active</label>
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
                            if (allSelected) { available.forEach(p => next.delete(p.id)) }
                            else { available.forEach(p => next.add(p.id)) }
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
                        if (el) el.indeterminate = selectedProducts.size > 0 && selectedProducts.size < discountProducts.length
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

                {/* Product Rows */}
                {(() => {
                  const grouped: { [key: string]: DiscountProduct[] } = {}
                  discountProducts.forEach(item => {
                    if (!grouped[item.product_id]) grouped[item.product_id] = []
                    grouped[item.product_id].push(item)
                  })

                  return Object.entries(grouped).map(([productId, items]) => (
                    <div key={productId} className="border-b border-gray-200 last:border-b-0">
                      {/* Product Header */}
                      <div className="px-4 py-3 bg-white flex items-center justify-between border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            ref={(el) => {
                              if (el) {
                                const keys = items.map(i => i.variant_id ? `${i.product_id}-${i.variant_id}` : i.product_id)
                                const cnt = keys.filter(k => selectedProducts.has(k)).length
                                el.indeterminate = cnt > 0 && cnt < keys.length
                              }
                            }}
                            checked={items.every(i => selectedProducts.has(i.variant_id ? `${i.product_id}-${i.variant_id}` : i.product_id))}
                            onChange={() => {
                              const keys = items.map(i => i.variant_id ? `${i.product_id}-${i.variant_id}` : i.product_id)
                              const allSel = keys.every(k => selectedProducts.has(k))
                              setSelectedProducts(prev => {
                                const next = new Set(prev)
                                keys.forEach(k => allSel ? next.delete(k) : next.add(k))
                                return next
                              })
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-luxury-gold focus:ring-luxury-gold"
                          />
                          {items[0].image_url && (
                            <img src={items[0].image_url} alt={items[0].product_name} className="h-12 w-12 rounded object-cover border border-gray-200" />
                          )}
                          <span className="text-sm font-medium text-gray-900">{items[0].product_name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDiscountProducts(prev => prev.filter(p => p.product_id !== productId))}
                          className="text-red-500 hover:text-red-600 text-sm font-medium"
                        >
                          Remove
                        </button>
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
                          ? Math.round(((originalPrice - discountedPrice) / originalPrice) * 100) : 0

                        return (
                          <div key={idx} className="grid grid-cols-12 gap-2 items-center px-4 py-3 bg-white hover:bg-gray-50">
                            <div className="col-span-1 flex items-center pl-4" />
                            <div className="col-span-1">
                              <span className="text-sm text-gray-600">{item.variant_name || '-'}</span>
                              {item.stock === 0 && <span className="text-xs text-red-500 block">Out of stock</span>}
                            </div>
                            <div className="col-span-1 text-sm text-gray-700">
                              ${originalPrice.toFixed(2)}
                            </div>
                            <div className="col-span-2">
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500">$</span>
                                <input
                                  key={`dp-${globalIndex}-${item.product_id}-${item.variant_id || 'nv'}`}
                                  type="text"
                                  defaultValue={discountedPrice.toFixed(2)}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0
                                    const newPrice = Math.max(0, Math.min(val, originalPrice))
                                    updateDiscountProduct(globalIndex, 'discounted_price', newPrice)
                                  }}
                                  onBlur={(e) => {
                                    const val = parseFloat(e.target.value) || 0
                                    e.target.value = val.toFixed(2)
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
                                <option value="">None</option>
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
                                <option value="">1</option>
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
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500" />
                              </label>
                            </div>
                            <div className="col-span-1" />
                          </div>
                        )
                      })}
                    </div>
                  ))
                })()}
              </div>
            )}

            {/* Sticky Save Footer */}
            <div className="sticky bottom-0 z-10 flex items-center justify-end gap-4 bg-gray-50 border-t border-gray-200 px-6 py-4 -mx-6 mt-6">
              <Link href="/cms/discounts">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button
                type="submit"
                disabled={saving || discountProducts.length === 0}
                className="bg-luxury-gold hover:bg-luxury-gold/90"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
