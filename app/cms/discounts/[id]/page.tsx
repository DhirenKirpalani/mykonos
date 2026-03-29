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

  useEffect(() => {
    fetchDiscount()
  }, [discountId])

  const fetchDiscount = async () => {
    try {
      const response = await fetch(`/api/discounts/${discountId}`)
      if (response.ok) {
        const data = await response.json()
        setFormData({
          name: data.name,
          start_date: data.start_date ? new Date(data.start_date).toISOString().slice(0, 16) : '',
          end_date: data.end_date ? new Date(data.end_date).toISOString().slice(0, 16) : '',
          is_active: data.is_active ?? true
        })
        setDiscountProducts(data.discount_products || [])
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
      const response = await fetch(`/api/discounts/${discountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          start_date: formData.start_date,
          end_date: formData.end_date,
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

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Products in Discount</h2>
            <div className="text-sm text-gray-600">
              {discountProducts.length} products configured
            </div>
            <p className="text-xs text-gray-500 mt-2">
              To modify products, please create a new discount campaign
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
