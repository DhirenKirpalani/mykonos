'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface StockEditModalProps {
  isOpen: boolean
  onClose: () => void
  product: {
    id: string
    name: string
    stock_quantity: number
  }
  onUpdate: () => void
}

export function StockEditModal({ isOpen, onClose, product, onUpdate }: StockEditModalProps) {
  const [stockQuantity, setStockQuantity] = useState(product.stock_quantity.toString())
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

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
          stock_quantity: parseInt(stockQuantity),
        }),
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
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5 text-gray-600" />
        </button>

        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Edit Stock</h2>
          <p className="text-sm text-gray-600 mb-6">{product.name}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="flex gap-3 pt-4">
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
                {loading ? 'Updating...' : 'Update Stock'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
