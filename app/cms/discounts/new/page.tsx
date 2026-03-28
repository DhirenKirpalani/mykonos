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
  const [showProductSelector, setShowProductSelector] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
  })
  
  const [discountProducts, setDiscountProducts] = useState<DiscountProduct[]>([])
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [bulkDiscount, setBulkDiscount] = useState({ type: 'percentage' as 'percentage' | 'fixed', value: 0, promo_stock: '', min_purchase: '' })

  useEffect(() => {
    fetchProducts()
  }, [])

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

  const addProduct = (product: Product) => {
    // Check for duplicates
    const isDuplicate = discountProducts.some(dp => dp.product_id === product.id)
    if (isDuplicate) {
      toast.error('Product already added')
      return
    }

    // If product has variants, add all variants
    if (product.variants && product.variants.length > 0) {
      const variantProducts: DiscountProduct[] = product.variants.map(variant => ({
        product_id: product.id,
        product_name: product.name,
        variant_id: variant.id,
        variant_name: variant.name,
        original_price: variant.price_idr,
        discount_type: 'percentage',
        discount_value: 0,
        discounted_price: variant.price_idr,
        promo_stock: variant.stock_quantity,
        stock: variant.stock_quantity,
        min_purchase: 1,
        is_active: true,
        image_url: product.image_url,
      }))
      setDiscountProducts(prev => [...prev, ...variantProducts])
    } else {
      // Add product without variants
      const newProduct: DiscountProduct = {
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
        image_url: product.image_url,
      }
      setDiscountProducts(prev => [...prev, newProduct])
    }
    setShowProductSelector(false)
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

      const response = await fetch('/api/discounts', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...formData,
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informasi Dasar</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nama Promo Toko *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                maxLength={150}
                placeholder="Nama Promo Toko tidak dapat dipertahankan ke Pembeli"
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
              />
              <p className="mt-1 text-xs text-gray-500">{formData.name.length}/150</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Periode Promo Toko
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
                  &nbsp;
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
            <h2 className="text-lg font-semibold text-gray-900">Produk dalam Promo Toko</h2>
            <Button
              type="button"
              onClick={() => setShowProductSelector(!showProductSelector)}
              variant="outline"
              className="border-luxury-gold text-luxury-gold hover:bg-luxury-gold/10"
            >
              <Plus className="mr-2 h-4 w-4" />
              Tambah Produk
            </Button>
          </div>

          {showProductSelector && (
            <div className="mb-6 rounded-lg border border-gray-200 p-4">
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                  />
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="border border-gray-200 rounded-lg p-3 hover:border-luxury-gold transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {product.image_url && (
                          <img src={product.image_url} alt={product.name} className="h-12 w-12 rounded object-cover" />
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-600">Rp{product.price_idr.toLocaleString('id-ID')}</div>
                          {product.variants && product.variants.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">{product.variants.length} variants</div>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => addProduct(product)}
                        className="bg-luxury-gold hover:bg-luxury-gold/90"
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-sm text-gray-600 mb-4">
            {discountProducts.length} total produk
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
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Diskon</label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      value={bulkDiscount.value}
                      onChange={(e) => setBulkDiscount(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                      className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                      min="0"
                    />
                    <select
                      value={bulkDiscount.type}
                      onChange={(e) => setBulkDiscount(prev => ({ ...prev, type: e.target.value as 'percentage' | 'fixed' }))}
                      className="rounded border border-gray-300 px-2 py-1 text-sm"
                    >
                      <option value="percentage">%DISKON</option>
                      <option value="fixed">IDR</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Stok Promosi</label>
                  <input
                    type="number"
                    value={bulkDiscount.promo_stock}
                    onChange={(e) => setBulkDiscount(prev => ({ ...prev, promo_stock: e.target.value }))}
                    placeholder="Tidak ad..."
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Batas Pembelian</label>
                  <input
                    type="number"
                    value={bulkDiscount.min_purchase}
                    onChange={(e) => setBulkDiscount(prev => ({ ...prev, min_purchase: e.target.value }))}
                    placeholder="Tidak ad..."
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                    min="1"
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
                    checked={selectedProducts.size === discountProducts.length && discountProducts.length > 0}
                    onChange={() => {
                      if (selectedProducts.size === discountProducts.length) {
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
                <div className="col-span-2 text-center">Diskon</div>
                <div className="col-span-1 text-center">Stok</div>
                <div className="col-span-1 text-center">Stok Promosi</div>
                <div className="col-span-1 text-center">Batas Pembelian</div>
                <div className="col-span-1 text-center">Aktifkan / Nonaktifkan</div>
                <div className="col-span-1 text-right">Aksi</div>
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
                          <select className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-500">
                            <option>Tidak T...</option>
                          </select>
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

                      {/* Variant / Product Rows - Always expanded */}
                      <div className="divide-y divide-gray-100">
                        {items.map((item, idx) => {
                          const globalIndex = discountProducts.findIndex(p =>
                            p.product_id === item.product_id &&
                            (item.variant_id ? p.variant_id === item.variant_id : !p.variant_id)
                          )
                          const itemKey = item.variant_id ? `${item.product_id}-${item.variant_id}` : item.product_id
                          const isSelected = selectedProducts.has(itemKey)
                          const discountPercent = item.discount_type === 'percentage' ? item.discount_value : (item.original_price > 0 ? Math.round((1 - item.discounted_price / item.original_price) * 100) : 0)
                          return (
                            <div key={idx} className="grid grid-cols-12 gap-2 items-center px-4 py-3 bg-white hover:bg-gray-50">
                              {/* Checkbox */}
                              <div className="col-span-1 flex items-center pl-4">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelection(item.product_id, item.variant_id)}
                                  className="h-4 w-4 rounded border-gray-300 text-luxury-gold focus:ring-luxury-gold"
                                />
                              </div>
                              {/* Variant Name */}
                              <div className="col-span-1">
                                <span className="text-sm text-gray-900 truncate block">{item.variant_name || '-'}</span>
                                {item.stock === 0 && <span className="text-xs text-red-500">Habis</span>}
                              </div>
                              {/* Original Price */}
                              <div className="col-span-1 text-sm text-gray-700">
                                Rp{item.original_price.toLocaleString('id-ID')}
                              </div>
                              {/* Discount Price (Rp input) + OR + Discount % */}
                              <div className="col-span-2">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-500">Rp</span>
                                  <input
                                    type="number"
                                    value={item.discount_type === 'fixed' ? item.discount_value : Math.round(item.discounted_price)}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0
                                      updateDiscountProduct(globalIndex, 'discount_type', 'fixed')
                                      updateDiscountProduct(globalIndex, 'discount_value', item.original_price - val)
                                    }}
                                    className="w-20 rounded border border-gray-300 px-2 py-1 text-xs"
                                    min="0"
                                  />
                                </div>
                              </div>
                              {/* Discount % + OR */}
                              <div className="col-span-2">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-400">OR</span>
                                  <input
                                    type="number"
                                    value={item.discount_type === 'percentage' ? item.discount_value : discountPercent}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0
                                      updateDiscountProduct(globalIndex, 'discount_type', 'percentage')
                                      updateDiscountProduct(globalIndex, 'discount_value', val)
                                    }}
                                    className="w-12 rounded border border-gray-300 px-2 py-1 text-xs"
                                    min="0"
                                    max="100"
                                  />
                                  <span className="text-xs text-gray-500">%DISKON</span>
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
                                  <option value="">Tidak T...</option>
                                  <option value="10">10</option>
                                  <option value="25">25</option>
                                  <option value="50">50</option>
                                  <option value="100">100</option>
                                </select>
                              </div>
                              {/* Min Purchase */}
                              <div className="col-span-1">
                                <select
                                  value={item.min_purchase?.toString() || ''}
                                  onChange={(e) => updateDiscountProduct(globalIndex, 'min_purchase', e.target.value ? parseInt(e.target.value) : undefined)}
                                  className="w-full rounded border border-gray-300 px-1 py-1 text-xs"
                                >
                                  <option value="">Tidak T...</option>
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

        {/* Submit Buttons */}
        <div className="flex items-center justify-end gap-4">
          <Link href="/cms/discounts">
            <Button type="button" variant="outline">
              Batal
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={loading || discountProducts.length === 0}
            className="bg-luxury-gold hover:bg-luxury-gold/90"
          >
            {loading ? 'Creating...' : 'Konfirmasi'}
          </Button>
        </div>
      </form>
    </div>
  )
}
