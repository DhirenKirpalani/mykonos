'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, Edit, Trash2, Eye, EyeOff, Upload, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { StockEditModal } from '@/components/StockEditModal'

interface Product {
  id: string
  name: string
  slug: string
  price_usd: number
  price_idr: number
  stock_quantity: number
  is_visible: boolean
  created_at: string
  image_url?: string
  variants?: Array<{
    name: string
    sku: string
    stock_quantity: number
  }>
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [stockModalOpen, setStockModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

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
    } finally {
      setLoading(false)
    }
  }

  const toggleVisibility = async (productId: string, currentVisibility: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast.error('Authentication required', {
          description: 'Please log in to perform this action'
        })
        return
      }

      const response = await fetch(`/api/products/admin/${productId}/visibility`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ is_visible: !currentVisibility }),
      })
      
      if (response.ok) {
        toast.success('Visibility updated', {
          description: `Product is now ${!currentVisibility ? 'visible' : 'hidden'}`
        })
        fetchProducts()
      } else {
        const errorData = await response.json()
        toast.error('Failed to update visibility', {
          description: errorData.error || 'Unknown error'
        })
      }
    } catch (error: any) {
      console.error('Error toggling visibility:', error)
      toast.error('An error occurred', {
        description: error.message || 'Please try again'
      })
    }
  }

  const deleteProduct = async (productId: string, productName: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast.error('Authentication required', {
          description: 'Please log in to perform this action'
        })
        return
      }

      const response = await fetch(`/api/products/admin/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
      
      if (response.ok) {
        toast.success('Product deleted', {
          description: `"${productName}" has been removed`
        })
        fetchProducts()
      } else {
        const errorData = await response.json()
        toast.error('Failed to delete product', {
          description: errorData.error || 'Unknown error'
        })
      }
    } catch (error: any) {
      console.error('Error deleting product:', error)
      toast.error('An error occurred', {
        description: error.message || 'Please try again'
      })
    }
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.slug.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleStockClick = (product: Product) => {
    setSelectedProduct(product)
    setStockModalOpen(true)
  }

  const handleStockUpdate = () => {
    fetchProducts()
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Loading products...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="mt-2 text-gray-600">Manage your product catalog</p>
        </div>
        <div className="flex gap-3">
          <Link href="/cms/products/bulk-upload">
            <Button variant="outline" className="border-luxury-gold text-luxury-gold hover:bg-luxury-gold/10">
              <Upload className="mr-2 h-4 w-4" />
              Bulk Upload
            </Button>
          </Link>
          <Link href="/cms/products/new">
            <Button className="bg-luxury-gold text-luxury-navy hover:bg-luxury-gold/90">
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div className="mb-6">
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

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left text-sm font-medium text-gray-500">
                <th className="pb-3">Product</th>
                <th className="pb-3">Price (USD)</th>
                <th className="pb-3">Price (IDR)</th>
                <th className="pb-3">Stock</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="text-sm">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      {product.image_url && (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{product.name}</div>
                        <div className="text-gray-500">{product.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 text-gray-900">${((product.price_usd || 0)).toFixed(2)}</td>
                  <td className="py-4 text-gray-900">Rp{((product.price_idr || 0)).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                  <td className="py-4">
                    <button
                      onClick={() => handleStockClick(product)}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-all hover:ring-2 hover:ring-offset-1 ${
                        product.stock_quantity > 10
                          ? 'bg-green-100 text-green-800 hover:ring-green-300'
                          : product.stock_quantity > 0
                          ? 'bg-yellow-100 text-yellow-800 hover:ring-yellow-300'
                          : 'bg-red-100 text-red-800 hover:ring-red-300'
                      }`}
                      title="Click to edit stock"
                    >
                      <Package className="h-3 w-3" />
                      {product.stock_quantity} units
                    </button>
                  </td>
                  <td className="py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        product.is_visible
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {product.is_visible ? 'Visible' : 'Hidden'}
                    </span>
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <Link href={`/cms/products/${product.id}`}>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleVisibility(product.id, product.is_visible)}
                      >
                        {product.is_visible ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          toast.error(`Delete "${product.name}"?`, {
                            description: 'This action cannot be undone.',
                            action: {
                              label: 'Delete',
                              onClick: () => deleteProduct(product.id, product.name),
                            },
                          })
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredProducts.length === 0 && (
            <div className="py-12 text-center text-gray-500">
              No products found. Create your first product to get started.
            </div>
          )}
        </div>
      </div>

      {selectedProduct && (
        <StockEditModal
          isOpen={stockModalOpen}
          onClose={() => setStockModalOpen(false)}
          product={selectedProduct}
          onUpdate={handleStockUpdate}
        />
      )}
    </div>
  )
}
