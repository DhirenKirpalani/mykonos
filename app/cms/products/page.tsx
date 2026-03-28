'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, Edit, Trash2, Eye, EyeOff, Upload, Package, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { StockEditModal } from '@/components/StockEditModal'
import { AuditLogModal } from '@/components/AuditLogModal'

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
  image_urls?: string[]
  variants?: Array<{
    id?: string
    name: string
    sku: string
    stock_quantity: number
    price_usd?: number
    price_idr?: number
  }>
}

interface ExpandedRows {
  [key: string]: boolean
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [stockModalOpen, setStockModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [auditLogOpen, setAuditLogOpen] = useState(false)
  const [auditProduct, setAuditProduct] = useState<Product | null>(null)
  const [expandedRows, setExpandedRows] = useState<ExpandedRows>({})

  const toggleRow = (productId: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }))
  }

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

  const SkeletonRows = () => (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-gray-200" />
              <div className="space-y-1.5">
                <div className="h-4 w-36 rounded bg-gray-200" />
                <div className="h-3 w-24 rounded bg-gray-100" />
              </div>
            </div>
          </td>
          <td className="py-4"><div className="h-4 w-16 rounded bg-gray-200" /></td>
          <td className="py-4"><div className="h-4 w-20 rounded bg-gray-200" /></td>
          <td className="py-4"><div className="h-6 w-20 rounded-full bg-gray-200" /></td>
          <td className="py-4"><div className="h-6 w-16 rounded-full bg-gray-200" /></td>
          <td className="py-4"><div className="h-6 w-6 rounded bg-gray-200" /></td>
          <td className="py-4">
            <div className="flex gap-2">
              <div className="h-7 w-7 rounded bg-gray-200" />
              <div className="h-7 w-7 rounded bg-gray-200" />
              <div className="h-7 w-7 rounded bg-gray-200" />
            </div>
          </td>
        </tr>
      ))}
    </>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="mt-2 text-gray-600">Manage your product catalog</p>
        </div>
        <div className="flex gap-3">
          <Link href="/cms/products/bulk-upload-media">
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
                <th className="pb-3">Audit</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? <SkeletonRows /> : filteredProducts.map((product) => {
                const productImages = product.image_urls || (product.image_url ? [product.image_url] : [])
                const imageUrls = productImages.filter(url => {
                  const ext = url.toLowerCase().split('.').pop()
                  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')
                })
                const hasVariants = product.variants && product.variants.length > 0
                const isExpanded = expandedRows[product.id]
                
                return (
                <>
                <tr key={product.id} className="text-sm hover:bg-gray-50">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      {hasVariants && (
                        <button
                          onClick={() => toggleRow(product.id)}
                          className="text-gray-400 hover:text-gray-600 transition-transform"
                          style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                        >
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                      {imageUrls.length > 0 ? (
                        <img
                          src={imageUrls[0]}
                          alt={product.name}
                          className="h-16 w-16 rounded-lg object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                      <div className="flex flex-col gap-1">
                        <div className="font-medium text-gray-900">{product.name}</div>
                        {hasVariants && product.variants && (
                          <div className="text-xs text-gray-600 font-medium">
                            {product.variants.length} variant{product.variants.length > 1 ? 's' : ''}
                          </div>
                        )}
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAuditProduct(product)
                        setAuditLogOpen(true)
                      }}
                      className="text-luxury-gold hover:text-luxury-gold/80"
                    >
                      <Clock className="h-4 w-4" />
                    </Button>
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
                {hasVariants && isExpanded && product.variants && (
                  <tr className="bg-gray-50">
                    <td colSpan={7} className="py-3 px-6">
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-gray-700 uppercase mb-3">Variants</div>
                        <div className="grid gap-2">
                          {product.variants.map((variant, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200">
                              <div className="flex items-center gap-3">
                                <div className="text-sm font-medium text-gray-900">{variant.name}</div>
                                <div className="text-xs text-gray-500">{variant.sku}</div>
                              </div>
                              <div className="flex items-center gap-4">
                                {variant.price_usd && (
                                  <div className="text-sm text-gray-700">${variant.price_usd.toFixed(2)}</div>
                                )}
                                {variant.price_idr && (
                                  <div className="text-sm text-gray-700">Rp{variant.price_idr.toLocaleString('id-ID')}</div>
                                )}
                                <div className="text-sm">
                                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                                    variant.stock_quantity > 10
                                      ? 'bg-green-100 text-green-800'
                                      : variant.stock_quantity > 0
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {variant.stock_quantity} units
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                </>
              )})}
            </tbody>
          </table>
          {!loading && filteredProducts.length === 0 && (
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

      {auditProduct && (
        <AuditLogModal
          isOpen={auditLogOpen}
          onClose={() => setAuditLogOpen(false)}
          entityType="product"
          entityId={auditProduct.id}
          entityName={auditProduct.name}
        />
      )}
    </div>
  )
}
