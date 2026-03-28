'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { ArrowLeft, Save, Search, X } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Product {
  id: string
  name: string
  price_idr: number
  image_url?: string
  fragrance_family?: string
}

export default function EditPromoCodePage() {
  const router = useRouter()
  const params = useParams()
  const promoId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showProductSearch, setShowProductSearch] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    usage_limit: '',
    max_uses_per_user: '1',
    min_purchase_amount: '',
    max_discount_cap: '',
    scope: 'all',
    valid_from: '',
    valid_until: '',
    is_active: true
  })
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')

  useEffect(() => {
    fetchPromoCode()
  }, [promoId])

  useEffect(() => {
    if (formData.scope === 'specific_products' || formData.scope === 'categories') {
      fetchProducts()
    }
  }, [formData.scope])

  const fetchPromoCode = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/promo-codes/${promoId}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setFormData({
          name: data.name || '',
          code: data.code || '',
          discount_type: data.discount_type || 'percentage',
          discount_value: data.discount_value?.toString() || '',
          usage_limit: data.usage_limit_global?.toString() || '',
          max_uses_per_user: data.usage_limit_per_user?.toString() || '1',
          min_purchase_amount: data.min_purchase_amount?.toString() || '',
          max_discount_cap: data.max_discount_amount?.toString() || '',
          scope: data.scope || 'all',
          valid_from: data.valid_from ? new Date(data.valid_from).toISOString().slice(0, 16) : '',
          valid_until: data.valid_until ? new Date(data.valid_until).toISOString().slice(0, 16) : '',
          is_active: data.is_active ?? true
        })
        setSelectedProductIds(data.applicable_product_ids || [])
        setSelectedCategory(data.applicable_category || '')
      } else {
        toast.error('Failed to load voucher')
        router.push('/cms/promo-codes')
      }
    } catch (error) {
      console.error('Error fetching promo code:', error)
      toast.error('Failed to load voucher')
    } finally {
      setLoading(false)
    }
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

  const categories = Array.from(new Set(products.map(p => p.fragrance_family).filter((f): f is string => Boolean(f))))

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const validateForm = (): string[] => {
    const errors: string[] = []
    const discountVal = parseFloat(formData.discount_value)
    const usageLimit = formData.usage_limit ? parseInt(formData.usage_limit) : null
    const maxPerUser = formData.max_uses_per_user ? parseInt(formData.max_uses_per_user) : null
    const minPurchase = formData.min_purchase_amount ? parseFloat(formData.min_purchase_amount) : null
    const maxCap = formData.max_discount_cap ? parseFloat(formData.max_discount_cap) : null

    if (formData.discount_type === 'percentage' && discountVal > 100) {
      errors.push('Percentage discount cannot exceed 100%')
    }
    if (discountVal <= 0) {
      errors.push('Discount value must be greater than 0')
    }
    if (maxCap !== null && maxCap < 0) {
      errors.push('Maximum discount cap must be 0 or greater')
    }
    if (minPurchase !== null && minPurchase < 0) {
      errors.push('Minimum purchase amount must be 0 or greater')
    }
    if (formData.valid_from && formData.valid_until && new Date(formData.valid_until) <= new Date(formData.valid_from)) {
      errors.push('End date must be after start date')
    }
    if (usageLimit !== null && maxPerUser !== null && maxPerUser > usageLimit) {
      errors.push('Max uses per user cannot exceed total usage limit')
    }
    if (formData.scope === 'specific_products' && selectedProductIds.length === 0) {
      errors.push('Please select at least one product for specific product scope')
    }
    if (formData.scope === 'categories' && !selectedCategory) {
      errors.push('Please select a category')
    }
    return errors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const errors = validateForm()
    setValidationErrors(errors)
    if (errors.length > 0) {
      toast.error('Please fix validation errors before submitting')
      return
    }

    setSaving(true)

    try {
      const response = await fetch(`/api/promo-codes/${promoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          code: formData.code,
          discount_type: formData.discount_type,
          discount_value: parseFloat(formData.discount_value),
          usage_limit_global: formData.usage_limit ? parseInt(formData.usage_limit) : null,
          usage_limit_per_user: formData.max_uses_per_user ? parseInt(formData.max_uses_per_user) : null,
          min_purchase_amount: formData.min_purchase_amount ? parseFloat(formData.min_purchase_amount) : null,
          max_discount_amount: formData.max_discount_cap ? parseFloat(formData.max_discount_cap) : null,
          scope: formData.scope,
          applicable_product_ids: formData.scope === 'specific_products' ? selectedProductIds : null,
          applicable_category: formData.scope === 'categories' ? selectedCategory : null,
          valid_from: formData.valid_from || null,
          valid_until: formData.valid_until || null,
          is_active: formData.is_active,
        })
      })

      if (response.ok) {
        toast.success('Voucher updated successfully')
        router.push('/cms/promo-codes')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to update voucher')
      }
    } catch (error) {
      console.error('Error updating voucher:', error)
      toast.error('Failed to update voucher')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-luxury-gold mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading voucher...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/cms/promo-codes"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Voucher</h1>
          <p className="mt-1 text-gray-600">Update voucher discount code</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Voucher Details - Same as create form */}
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Voucher Details</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Voucher Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                placeholder="e.g., Summer Sale 2024"
              />
              <p className="mt-1 text-xs text-gray-500">Internal name to help you identify this voucher</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Voucher Code *
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 font-mono uppercase focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                placeholder="SUMMER2024"
              />
              <p className="mt-1 text-xs text-gray-500">Code customers will enter at checkout</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discount Type *
                </label>
                <select
                  required
                  value={formData.discount_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, discount_type: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (IDR)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discount Value *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.discount_value}
                  onChange={(e) => setFormData(prev => ({ ...prev, discount_value: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                  placeholder={formData.discount_type === 'percentage' ? 'e.g. 10' : 'e.g. 50000'}
                />
              </div>
            </div>

            {formData.discount_type === 'percentage' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Discount Cap (IDR)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.max_discount_cap}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_discount_cap: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                  placeholder="e.g. 50000"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Cap the maximum discount amount. Leave empty for no cap.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Purchase Amount (IDR)
              </label>
              <input
                type="number"
                min="0"
                value={formData.min_purchase_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, min_purchase_amount: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                placeholder="e.g. 100000"
              />
              <p className="mt-1 text-sm text-gray-500">
                Minimum order value required to use this voucher. Leave empty for no minimum.
              </p>
            </div>
          </div>
        </div>

        {/* Usage Limits */}
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage Limits</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Usage Limit
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.usage_limit}
                  onChange={(e) => setFormData(prev => ({ ...prev, usage_limit: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                  placeholder="Unlimited"
                />
                <p className="mt-1 text-sm text-gray-500">Leave empty for unlimited.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Uses Per User
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.max_uses_per_user}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_uses_per_user: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                  placeholder="1"
                />
                <p className="mt-1 text-sm text-gray-500">Default is 1. Leave empty for unlimited.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Scope - Same as create form */}
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Voucher Scope</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Apply To
              </label>
              <div className="space-y-2">
                {[
                  { value: 'all', label: 'All Products', desc: 'Voucher applies to the entire order' },
                  { value: 'specific_products', label: 'Specific Products', desc: 'Only selected products are eligible' },
                  { value: 'categories', label: 'Categories', desc: 'All products in a specific category' },
                ].map(option => (
                  <label key={option.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${formData.scope === option.value ? 'border-luxury-gold bg-luxury-gold/5' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input
                      type="radio"
                      name="scope"
                      value={option.value}
                      checked={formData.scope === option.value}
                      onChange={(e) => setFormData(prev => ({ ...prev, scope: e.target.value }))}
                      className="mt-0.5 h-4 w-4 border-gray-300 text-luxury-gold focus:ring-luxury-gold"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{option.label}</div>
                      <div className="text-xs text-gray-500">{option.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Product/Category selectors - same as create form */}
            {formData.scope === 'specific_products' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Products
                </label>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setShowProductSearch(true)}
                    className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                  />
                </div>

                {selectedProductIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedProductIds.map(id => {
                      const product = products.find(p => p.id === id)
                      return product ? (
                        <span key={id} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-luxury-gold/10 text-luxury-gold text-xs font-medium">
                          {product.name}
                          <button
                            type="button"
                            onClick={() => setSelectedProductIds(prev => prev.filter(pid => pid !== id))}
                            className="hover:text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ) : null
                    })}
                  </div>
                )}

                {showProductSearch && (
                  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {filteredProducts.map(product => {
                      const isSelected = selectedProductIds.includes(product.id)
                      return (
                        <label key={product.id} className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 ${isSelected ? 'bg-luxury-gold/5' : ''}`}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedProductIds(prev =>
                                isSelected ? prev.filter(id => id !== product.id) : [...prev, product.id]
                              )
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-luxury-gold focus:ring-luxury-gold"
                          />
                          {product.image_url && (
                            <img src={product.image_url} alt={product.name} className="h-8 w-8 rounded object-cover" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{product.name}</div>
                            <div className="text-xs text-gray-500">Rp{product.price_idr?.toLocaleString('id-ID')}</div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-500">{selectedProductIds.length} product(s) selected</p>
              </div>
            )}

            {formData.scope === 'categories' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                >
                  <option value="">Select a category...</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Validity Period */}
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Validity Period</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valid From
                </label>
                <input
                  type="datetime-local"
                  value={formData.valid_from}
                  onChange={(e) => setFormData(prev => ({ ...prev, valid_from: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valid Until
                </label>
                <input
                  type="datetime-local"
                  value={formData.valid_until}
                  onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Status</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Voucher Status</p>
              <p className="text-xs text-gray-500 mt-1">
                {formData.is_active ? 'Voucher is active and can be used by customers' : 'Voucher is inactive and cannot be used'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium ${formData.is_active ? 'text-green-600' : 'text-gray-500'}`}>
                {formData.is_active ? 'Active' : 'Inactive'}
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-luxury-gold/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <h3 className="text-sm font-semibold text-red-800 mb-2">Please fix the following errors:</h3>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((error, idx) => (
                <li key={idx} className="text-sm text-red-700">{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-luxury-gold px-6 py-3 text-sm font-medium text-white hover:bg-luxury-gold/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Updating...' : 'Update Voucher'}
          </button>
          <Link
            href="/cms/promo-codes"
            className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
