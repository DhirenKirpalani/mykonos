'use client'

import { Suspense, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ProductCard } from '@/components/product-card'
import { ProductFilters } from '@/components/product-filters'
import { Pagination } from '@/components/Pagination'
import { Breadcrumb } from '@/components/breadcrumb'
import { Database } from '@/lib/supabase/database.types'
import { useLanguage } from '@/contexts/LanguageContext'
import { useSearchParams, useRouter } from 'next/navigation'

type Product = Database['public']['Tables']['products']['Row']

const ITEMS_PER_PAGE = 12

function ProductsContent() {
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const category = searchParams.get('category') || undefined
  const collection = searchParams.get('collection') || undefined
  const isNew = searchParams.get('new') || undefined
  const sort = searchParams.get('sort') || 'best-selling'
  const page = searchParams.get('page') || '1'
  
  const currentPage = parseInt(page)
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  useEffect(() => {
    async function fetchProducts() {
      setIsLoading(true)
      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1

      let query = supabase.from('products').select('*', { count: 'exact' })

      if (category) {
        query = query.eq('fragrance_family', category)
      }

      if (collection) {
        query = query.eq('collection', collection)
      }

      if (isNew === 'true') {
        query = query.eq('is_new', true)
      }

      if (searchQuery.trim()) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
      }

      switch (sort) {
        case 'popular':
          query = query.order('rating', { ascending: false }).order('products_sold', { ascending: false })
          break
        case 'best-selling':
          query = query.order('products_sold', { ascending: false })
          break
        case 'price-asc':
          query = query.order('price_idr', { ascending: true })
          break
        case 'price-desc':
          query = query.order('price_idr', { ascending: false })
          break
        default:
          query = query.order('created_at', { ascending: false })
      }

      query = query.range(from, to)

      const { data, error, count } = await query as { data: Product[] | null; error: any; count: number | null }

      if (error || !data) {
        console.error('Error fetching products:', error)
        setProducts([])
        setTotalCount(0)
      } else {
        setProducts(data)
        setTotalCount(count || 0)
      }
      setIsLoading(false)
    }

    fetchProducts()
  }, [category, collection, isNew, sort, currentPage, searchQuery])

  // Prevent hydration mismatch - render loading state until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-white">
        <div className="border-b border-border/40 bg-luxury-gray-light py-4 md:py-6">
          <div className="container mx-auto px-4 md:px-6 lg:px-8">
            <div className="h-10 w-64 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
        <div className="container mx-auto px-4 py-6 md:px-6 md:py-8 lg:px-8">
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-luxury-navy"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header with Title and Search */}
      <div className="border-b border-border/40 bg-luxury-gray-light py-4 md:py-6">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <h1 className="text-2xl font-bold uppercase tracking-wider text-luxury-navy md:text-3xl lg:text-4xl">
            {t.productsPage.allFragrances}
          </h1>
          
          {/* Search Bar - Directly under title */}
          <div className="mt-3">
            <div className="relative max-w-md">
              <input
                type="text"
                placeholder={t.productsPage.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 pl-10 text-sm focus:border-[#C2A36B] focus:outline-none focus:ring-2 focus:ring-[#C2A36B]/20"
              />
              <svg
                className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-3 md:px-6 md:py-4 lg:px-8">
        {/* Breadcrumb - Desktop only */}
        <div className="mb-3 hidden md:block">
          <Breadcrumb 
            items={[
              { label: 'Products', href: '/products' }
            ]} 
          />
        </div>

        {/* Sort Controls - Sticky (Mobile Only) */}
        <div className="sticky top-0 z-10 bg-white py-2 mb-3 border-b border-gray-100 lg:hidden">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString())
                params.set('sort', 'popular')
                router.push(`/products?${params.toString()}`)
              }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                sort === 'popular'
                  ? 'bg-[#C2A36B] text-white shadow-sm'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t.productsPage.sort.popular}
            </button>
            <button
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString())
                params.set('sort', 'newest')
                router.push(`/products?${params.toString()}`)
              }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                sort === 'newest'
                  ? 'bg-[#C2A36B] text-white shadow-sm'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t.productsPage.sort.newest}
            </button>
            <button
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString())
                params.set('sort', 'best-selling')
                router.push(`/products?${params.toString()}`)
              }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                sort === 'best-selling'
                  ? 'bg-[#C2A36B] text-white shadow-sm'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t.productsPage.sort.bestSelling}
            </button>
            <button
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString())
                const currentPrice = sort?.startsWith('price-') ? sort : null
                if (currentPrice === 'price-asc') {
                  params.set('sort', 'price-desc')
                } else {
                  params.set('sort', 'price-asc')
                }
                router.push(`/products?${params.toString()}`)
              }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                sort?.startsWith('price-')
                  ? 'bg-[#C2A36B] text-white shadow-sm'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t.productsPage.price} {sort === 'price-desc' ? '↓' : '↑'}
            </button>
          </div>
        </div>

        <div className="grid gap-6 md:gap-8 lg:grid-cols-[260px_1fr]">
          <Suspense fallback={<div className="h-64 w-full animate-pulse rounded-lg bg-gray-100" />}>
            <ProductFilters />
          </Suspense>
          <div>
            {isLoading ? (
              <div className="flex min-h-[300px] items-center justify-center md:min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-luxury-navy"></div>
              </div>
            ) : products.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-2 lg:gap-5 xl:grid-cols-3">
                  {products.map((product: Product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
                <Pagination currentPage={currentPage} totalPages={totalPages} />
              </>
            ) : (
              <div className="flex min-h-[300px] items-center justify-center md:min-h-[400px]">
                <div className="text-center">
                  <p className="text-base text-muted-foreground md:text-lg">
                    {t.productsPage.noProducts}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white">
        <div className="border-b border-border/40 bg-luxury-gray-light py-8 md:py-10 lg:py-12">
          <div className="container mx-auto px-4 md:px-6 lg:px-8">
            <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
        <div className="container mx-auto px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-12">
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-luxury-navy"></div>
          </div>
        </div>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  )
}
