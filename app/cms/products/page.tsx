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
  low_stock_threshold?: number
  is_visible: boolean
  created_at: string
  image_url?: string
  image_urls?: string[]
  variants?: Array<{
    id?: string
    name: string
    sku: string
    stock_quantity: number
    low_stock_threshold?: number
    price_usd?: number
    price_idr?: number
  }>
}

type StockFilter = 'all' | 'low_stock' | 'out_of_stock'

interface ExpandedRows {
  [key: string]: boolean
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
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

  // Helper function to check if product or any variant is low stock
  const isLowStock = (product: Product): boolean => {
    // If product has variants, check each variant
    if (product.variants && product.variants.length > 0) {
      return product.variants.some(variant => {
        const threshold = variant.low_stock_threshold || 10
        return variant.stock_quantity > 0 && variant.stock_quantity <= threshold
      })
    }
    // Otherwise check product-level stock
    const threshold = product.low_stock_threshold || 10
    return product.stock_quantity > 0 && product.stock_quantity <= threshold
  }
  
  // Helper function to check if product or any variant is out of stock
  const isOutOfStock = (product: Product): boolean => {
    // If product has variants, check if any variant is out of stock
    if (product.variants && product.variants.length > 0) {
      return product.variants.some(variant => variant.stock_quantity === 0)
    }
    // Otherwise check product-level stock
    return product.stock_quantity === 0
  }

  const filteredProducts = products.filter(product => {
    // Search filter
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.slug.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (!matchesSearch) return false
    
    // Stock filter
    if (stockFilter === 'all') return true
    if (stockFilter === 'out_of_stock') return isOutOfStock(product)
    if (stockFilter === 'low_stock') return isLowStock(product)
    
    return true
  })
  
  // Calculate counts for each filter
  const lowStockCount = products.filter(p => isLowStock(p)).length
  const outOfStockCount = products.filter(p => isOutOfStock(p)).length
  
  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex)
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, stockFilter])

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
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Products</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">Manage your product catalog</p>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <Link href="/cms/products/bulk-upload-media" className="flex-1 sm:flex-none">
            <Button variant="outline" className="w-full sm:w-auto border-luxury-gold text-luxury-gold hover:bg-luxury-gold/10 text-xs sm:text-sm">
              <Upload className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Bulk Upload</span>
              <span className="sm:hidden">Upload</span>
            </Button>
          </Link>
          <Link href="/cms/products/new" className="flex-1 sm:flex-none">
            <Button className="w-full sm:w-auto bg-luxury-gold text-luxury-navy hover:bg-luxury-gold/90 text-xs sm:text-sm">
              <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Add Product</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="rounded-lg bg-white p-4 sm:p-6 shadow-sm ring-1 ring-gray-200">
        {/* Stock Filter Tabs */}
        <div className="mb-4 sm:mb-6 border-b border-gray-200">
          <div className="flex gap-2 sm:gap-4 overflow-x-auto">
            <button
              onClick={() => setStockFilter('all')}
              className={`px-3 sm:px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                stockFilter === 'all'
                  ? 'border-luxury-gold text-luxury-gold'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              All Products
              <span className="ml-1.5 sm:ml-2 inline-flex items-center justify-center px-1.5 sm:px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                {products.length}
              </span>
            </button>
            <button
              onClick={() => setStockFilter('low_stock')}
              className={`px-3 sm:px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                stockFilter === 'low_stock'
                  ? 'border-luxury-gold text-luxury-gold'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Low Stock
              {lowStockCount > 0 && (
                <span className="ml-1.5 sm:ml-2 inline-flex items-center justify-center px-1.5 sm:px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                  {lowStockCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setStockFilter('out_of_stock')}
              className={`px-3 sm:px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                stockFilter === 'out_of_stock'
                  ? 'border-luxury-gold text-luxury-gold'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Out of Stock
              {outOfStockCount > 0 && (
                <span className="ml-1.5 sm:ml-2 inline-flex items-center justify-center px-1.5 sm:px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
                  {outOfStockCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4 sm:mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 sm:h-5 sm:w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 sm:pl-10 pr-4 text-sm sm:text-base focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
            />
          </div>
        </div>

        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs sm:text-sm font-medium text-gray-500">
                  <th className="pb-2 sm:pb-3 pl-4 sm:pl-0 whitespace-nowrap">Product</th>
                  <th className="pb-2 sm:pb-3 whitespace-nowrap">Price (USD)</th>
                  <th className="pb-2 sm:pb-3 whitespace-nowrap hidden sm:table-cell">Price (IDR)</th>
                  <th className="pb-2 sm:pb-3 whitespace-nowrap">Stock</th>
                  <th className="pb-2 sm:pb-3 whitespace-nowrap">Status</th>
                  <th className="pb-2 sm:pb-3 whitespace-nowrap hidden lg:table-cell">Audit</th>
                  <th className="pb-2 sm:pb-3 pr-4 sm:pr-0 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? <SkeletonRows /> : paginatedProducts.map((product) => {
                const productImages = product.image_urls || (product.image_url ? [product.image_url] : [])
                const imageUrls = productImages.filter(url => {
                  const ext = url.toLowerCase().split('.').pop()
                  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')
                })
                const hasVariants = product.variants && product.variants.length > 0
                const isExpanded = expandedRows[product.id]
                
                return (
                <>
                  <tr key={product.id} className="text-xs sm:text-sm hover:bg-gray-50">
                    <td className="py-3 sm:py-4 pl-4 sm:pl-0">
                      <div className="flex items-center gap-2 sm:gap-3">
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
                          className="h-12 w-12 sm:h-16 sm:w-16 rounded-lg object-cover border border-gray-200"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            if (target.nextElementSibling) {
                              (target.nextElementSibling as HTMLElement).style.display = 'flex';
                            }
                          }}
                        />
                      ) : (
                        <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                          <Package className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
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
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 sm:py-1 text-xs font-medium hover:opacity-80 transition-colors cursor-pointer whitespace-nowrap ${
                        product.stock_quantity === 0
                          ? 'bg-red-100 text-red-800'
                          : product.stock_quantity <= (product.low_stock_threshold || 10)
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      <Package className="h-3 w-3" />
                      {product.stock_quantity} units
                    </button>
                  </td>
                  <td className="py-3 sm:py-4"> 
                    <button
                      onClick={() => toggleVisibility(product.id, product.is_visible)}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 sm:py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                        product.is_visible
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      {product.is_visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      <span className="hidden sm:inline">{product.is_visible ? 'Visible' : 'Hidden'}</span>
                    </button>
                  </td>
                  <td className="py-3 sm:py-4 hidden lg:table-cell">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAuditProduct(product)
                        setAuditLogOpen(true)
                      }}
                      className="text-luxury-gold hover:text-luxury-gold/80 h-7 w-7 sm:h-8 sm:w-8 p-0"
                    >
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </td>
                  <td className="py-3 sm:py-4 pr-4 sm:pr-0">
                    <div className="flex gap-1 sm:gap-2">
                      <Link href={`/cms/products/${product.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 sm:h-8 sm:w-8 p-0">
                          <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteProduct(product.id, product.name)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 sm:h-8 sm:w-8 p-0"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
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
                              <div className="flex flex-col gap-0.5 sm:gap-1 min-w-0">
                                <div className="font-medium text-gray-900 truncate max-w-[120px] sm:max-w-none">{variant.name}</div>
                                <div className="text-xs text-gray-500 truncate max-w-[120px] sm:max-w-none">{variant.sku}</div>
                              </div>
                              <div className="flex items-center gap-4">
                                {variant.price_usd && (
                                  <div className="text-sm text-gray-700">${variant.price_usd.toFixed(2)}</div>
                                )}
                                {variant.price_idr && (
                                  <div className="text-sm text-gray-700">Rp{variant.price_idr.toLocaleString('id-ID')}</div>
                                )}
                                <div className="text-sm">
                                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 sm:py-1 text-xs font-medium ${
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
                )
              })}
              </tbody>
            </table>
          </div>
          {!loading && filteredProducts.length === 0 && (
            <div className="py-12 text-center text-gray-500">
              No products found. Create your first product to get started.
            </div>
          )}
        </div>
        
        {/* Pagination Controls */}
        {!loading && filteredProducts.length > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-200 pt-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>per page</span>
              <span className="ml-2 text-gray-500">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? 'bg-luxury-gold text-luxury-navy'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
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
