'use client'

import { useState } from 'react'
import { X, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Variant {
  name: string
  sku: string
  price_usd: number
  price_idr: number
  stock_quantity: number
  image_url?: string
}

interface VariantStockModalProps {
  isOpen: boolean
  onClose: () => void
  product: {
    id: string
    name: string
    variants: Variant[]
  }
  onUpdate: () => void
}

export function VariantStockModal({ isOpen, onClose, product, onUpdate }: VariantStockModalProps) {
  const [variants, setVariants] = useState<Variant[]>(product.variants || [])
  const [bulkStock, setBulkStock] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleVariantStockChange = (index: number, value: string) => {
    const newVariants = [...variants]
    newVariants[index] = {
      ...newVariants[index],
      stock_quantity: parseInt(value) || 0
    }
    setVariants(newVariants)
  }

  const handleBulkUpdate = () => {
    const bulkValue = parseInt(bulkStock)
    if (isNaN(bulkValue) || bulkValue < 0) {
      toast.error('Please enter a valid stock quantity')
      return
    }
    
    const newVariants = variants.map(v => ({
      ...v,
      stock_quantity: bulkValue
    }))
    setVariants(newVariants)
    setBulkStock('')
    toast.success('Bulk stock updated (not saved yet)')
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

      const response = await fetch(`/api/products/admin/${product.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          variants: variants.map(v => ({
            name: v.name,
            sku: v.sku,
            price_usd: v.price_usd,
            price_idr: v.price_idr,
            stock_quantity: v.stock_quantity,
            image_url: v.image_url || ''
          }))
        }),
      })

      if (response.ok) {
        toast.success('Variant stock updated successfully')
        onUpdate()
        onClose()
      } else {
        const errorData = await response.json()
        toast.error('Failed to update variant stock', {
          description: errorData.error || 'Unknown error occurred'
        })
      }
    } catch (error: any) {
      console.error('Error updating variant stock:', error)
      toast.error('An error occurred', {
        description: error.message || 'Please try again'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5 text-gray-600" />
        </button>

        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Package className="h-6 w-6 text-luxury-navy" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Manage Variant Stock</h2>
              <p className="text-sm text-gray-600">{product.name}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Bulk Update Section */}
            <div className="bg-luxury-gray-light rounded-lg p-4 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Bulk Update All Variants</h3>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={bulkStock}
                  onChange={(e) => setBulkStock(e.target.value)}
                  min="0"
                  placeholder="Enter stock quantity"
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
                <Button
                  type="button"
                  onClick={handleBulkUpdate}
                  variant="outline"
                  className="border-luxury-navy text-luxury-navy hover:bg-luxury-navy hover:text-white"
                >
                  Apply to All
                </Button>
              </div>
            </div>

            {/* Individual Variant Stock */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Individual Variant Stock</h3>
              {variants.map((variant, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{variant.name}</div>
                    <div className="text-sm text-gray-500">SKU: {variant.sku}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Stock:</label>
                    <input
                      type="number"
                      value={variant.stock_quantity}
                      onChange={(e) => handleVariantStockChange(index, e.target.value)}
                      min="0"
                      className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-center focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-luxury-gold text-luxury-navy hover:bg-luxury-gold/90"
              >
                {loading ? 'Updating...' : 'Update Variant Stock'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
