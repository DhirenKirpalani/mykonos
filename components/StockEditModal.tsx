'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Variant {
  name: string
  sku: string
  stock_quantity: number
}

interface StockEditModalProps {
  isOpen: boolean
  onClose: () => void
  product: {
    id: string
    name: string
    stock_quantity: number
    variants?: Variant[]
  }
  onUpdate: () => void
}

export function StockEditModal({ isOpen, onClose, product, onUpdate }: StockEditModalProps) {
  const [activeTab, setActiveTab] = useState<'bulk' | 'variants'>('bulk')
  const [stockQuantity, setStockQuantity] = useState(product.stock_quantity.toString())
  const [variants, setVariants] = useState<Variant[]>(product.variants || [])
  const [loading, setLoading] = useState(false)
  
  const hasVariants = variants.length > 0

  if (!isOpen) return null

  const handleVariantStockChange = (index: number, value: string) => {
    const newVariants = [...variants]
    newVariants[index].stock_quantity = parseInt(value) || 0
    setVariants(newVariants)
  }

  const handleApplyToAll = async () => {
    const bulkValue = parseInt(stockQuantity)
    if (isNaN(bulkValue) || bulkValue < 0) {
      toast.error('Please enter a valid stock quantity')
      return
    }
    
    setLoading(true)
    try {
      const { supabase } = await import('@/lib/supabase/client')
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        toast.error('Authentication required')
        return
      }

      // Update variants with bulk value
      const updatedVariants = variants.map(v => ({
        ...v,
        stock_quantity: bulkValue
      }))

      const updateData: any = {
        stock_quantity: bulkValue,
        variants: updatedVariants,
        in_stock: bulkValue > 0
      }

      const response = await fetch(`/api/products/admin/${product.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(updateData),
      })

      if (response.ok) {
        setVariants(updatedVariants)
        toast.success('Applied to all variants and saved')
        onUpdate()
        onClose()
      } else {
        const errorData = await response.json()
        toast.error('Failed to update stock', {
          description: errorData.error || 'Unknown error occurred'
        })
      }
    } catch (error: any) {
      console.error('Error updating stock:', error)
      toast.error('An error occurred', {
        description: error.message || 'Please try again'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { supabase } = await import('@/lib/supabase/client')
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        toast.error('Authentication required')
        return
      }

      const updateData: any = {}
      
      // Update main product stock if no variants or bulk tab
      if (!hasVariants || activeTab === 'bulk') {
        updateData.stock_quantity = parseInt(stockQuantity)
        // Set in_stock to false if stock is 0
        updateData.in_stock = parseInt(stockQuantity) > 0
      }
      
      // Update variant stocks if variants exist
      if (hasVariants && activeTab === 'variants') {
        updateData.variants = variants.map(v => ({
          name: v.name,
          sku: v.sku,
          stock_quantity: v.stock_quantity
        }))
        
        // Calculate total stock from variants and update product stock_quantity
        const totalVariantStock = variants.reduce((sum, v) => sum + v.stock_quantity, 0)
        updateData.stock_quantity = totalVariantStock
        // Set in_stock to false if all variants are out of stock
        updateData.in_stock = totalVariantStock > 0
      }

      const response = await fetch(`/api/products/admin/${product.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(updateData),
      })

      if (response.ok) {
        toast.success('Stock updated successfully')
        onUpdate()
        onClose()
      } else {
        const errorData = await response.json()
        toast.error('Failed to update stock', {
          description: errorData.error || 'Unknown error occurred'
        })
      }
    } catch (error: any) {
      console.error('Error updating stock:', error)
      toast.error('An error occurred', {
        description: error.message || 'Please try again'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5 text-gray-600" />
        </button>

        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Atur Stok</h2>
          <p className="text-sm text-gray-600 mb-6">{product.name}</p>

          {/* Tabs - only show if product has variants */}
          {hasVariants && (
            <div className="flex gap-2 mb-6 border-b border-gray-200">
              <button
                type="button"
                onClick={() => setActiveTab('bulk')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'bulk'
                    ? 'border-luxury-gold text-luxury-gold'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Ubah Massal
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('variants')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'variants'
                    ? 'border-luxury-gold text-luxury-gold'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Stok
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Simple stock input for products without variants */}
            {!hasVariants && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    min="0"
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* Bulk Update Tab - only for products with variants */}
            {hasVariants && activeTab === 'bulk' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    min="0"
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* Variants Tab */}
            {activeTab === 'variants' && hasVariants && (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm font-medium text-gray-700 pb-2 border-b">
                    <span>Variasi</span>
                    <span>Total Stok</span>
                  </div>
                  {variants.map((variant, index) => (
                    <div key={index} className="flex items-center justify-between gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{variant.name}</p>
                        <p className="text-xs text-gray-500">SKU: {variant.sku}</p>
                      </div>
                      <input
                        type="number"
                        value={variant.stock_quantity}
                        onChange={(e) => handleVariantStockChange(index, e.target.value)}
                        min="0"
                        className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-center focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="flex-1"
              >
                Batal
              </Button>
              {hasVariants && activeTab === 'bulk' ? (
                <Button
                  type="button"
                  onClick={handleApplyToAll}
                  disabled={loading}
                  className="flex-1 bg-luxury-gold text-luxury-navy hover:bg-luxury-gold/90"
                >
                  {loading ? 'Updating...' : 'Terapkan Ke Semua'}
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-luxury-gold text-luxury-navy hover:bg-luxury-gold/90"
                >
                  {loading ? 'Updating...' : 'Update'}
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
