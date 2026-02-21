'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    price_idr: '',
    price_eur: '',
    stock_quantity: '',
    category: '',
    fragrance_family: '',
    collection: '',
    in_stock: true,
    volume_ml: '',
    weight_mg: '',
    shelf_life_months: '',
    formulation: '',
    gender: '',
    edition_type: '',
    bpom_number: '',
    ships_from: 'KOTA JAKARTA TIMUR',
    is_visible: true,
  })

  useEffect(() => {
    fetchProduct()
  }, [productId])

  const fetchProduct = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        toast.error('Authentication required')
        router.push('/cms/products')
        return
      }

      const response = await fetch(`/api/products/admin/${productId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const product = data.product
        
        setFormData({
          name: product.name || '',
          slug: product.slug || '',
          description: product.description || '',
          price: product.price?.toString() || '',
          price_idr: product.price_idr?.toString() || '',
          price_eur: product.price_eur?.toString() || '',
          stock_quantity: product.stock_quantity?.toString() || '',
          category: product.category || '',
          fragrance_family: product.fragrance_family || '',
          collection: product.collection || '',
          in_stock: product.in_stock ?? true,
          volume_ml: product.volume_ml?.toString() || '',
          weight_mg: product.weight_mg?.toString() || '',
          shelf_life_months: product.shelf_life_months?.toString() || '',
          formulation: product.formulation || '',
          gender: product.gender || '',
          edition_type: product.edition_type || '',
          bpom_number: product.bpom_number || '',
          ships_from: product.ships_from || 'KOTA JAKARTA TIMUR',
          is_visible: product.is_visible ?? true,
        })
      } else {
        toast.error('Failed to load product')
        router.push('/cms/products')
      }
    } catch (error) {
      console.error('Error fetching product:', error)
      toast.error('An error occurred')
      router.push('/cms/products')
    } finally {
      setFetching(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        toast.error('Authentication required')
        setLoading(false)
        return
      }

      const response = await fetch(`/api/products/admin/${productId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          price_idr: parseFloat(formData.price_idr),
          price_eur: parseFloat(formData.price_eur),
          stock_quantity: parseInt(formData.stock_quantity),
          volume_ml: formData.volume_ml ? parseInt(formData.volume_ml) : null,
          weight_mg: formData.weight_mg ? parseInt(formData.weight_mg) : null,
          shelf_life_months: formData.shelf_life_months ? parseInt(formData.shelf_life_months) : null,
        }),
      })

      if (response.ok) {
        toast.success('Product updated successfully!')
        router.push('/cms/products')
      } else {
        const errorData = await response.json()
        toast.error('Failed to update product', {
          description: errorData.error || 'Unknown error occurred'
        })
      }
    } catch (error: any) {
      console.error('Error updating product:', error)
      toast.error('An error occurred', {
        description: error.message || 'Please try again'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  if (fetching) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Loading product...</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/cms/products">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Product</h1>
          <p className="mt-2 text-gray-600">Update product information</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Product Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Slug *
                </label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
              />
            </div>
          </div>

          {/* Pricing Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Pricing</h3>
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Price (USD) *
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Price (IDR) *
                </label>
                <input
                  type="number"
                  name="price_idr"
                  value={formData.price_idr}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  required
                  placeholder="Indonesian Rupiah"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Price (EUR) *
                </label>
                <input
                  type="number"
                  name="price_eur"
                  value={formData.price_eur}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  required
                  placeholder="Euro"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>
            </div>
          </div>

          {/* Inventory Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Inventory</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Stock Quantity *
                </label>
                <input
                  type="number"
                  name="stock_quantity"
                  value={formData.stock_quantity}
                  onChange={handleChange}
                  min="0"
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  In Stock
                </label>
                <select
                  name="in_stock"
                  value={formData.in_stock ? 'true' : 'false'}
                  onChange={(e) => setFormData(prev => ({ ...prev, in_stock: e.target.value === 'true' }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>
          </div>

          {/* Product Details Section - Same as create form */}
          {/* ... rest of the form fields similar to create page ... */}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="is_visible"
              checked={formData.is_visible}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-luxury-gold focus:ring-luxury-gold"
            />
            <label className="text-sm font-medium text-gray-700">
              Make product visible on store
            </label>
          </div>

          <div className="flex gap-4 border-t border-gray-200 pt-6">
            <Button
              type="submit"
              disabled={loading}
              className="bg-luxury-gold text-luxury-navy hover:bg-luxury-gold/90"
            >
              {loading ? 'Updating...' : 'Update Product'}
            </Button>
            <Link href="/cms/products">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
          </div>
        </div>
      </form>
    </div>
  )
}
