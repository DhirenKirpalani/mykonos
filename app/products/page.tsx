'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ProductCard } from '@/components/product-card'
import { ProductFilters } from '@/components/product-filters'
import { Pagination } from '@/components/Pagination'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { Database } from '@/lib/supabase/database.types'
import { useLanguage } from '@/contexts/LanguageContext'
import { useRegion } from '@/contexts/RegionContext'
import { useSearchParams, useRouter } from 'next/navigation'
import { checkFeatureClient } from '@/lib/system-settings'

type Product = Database['public']['Tables']['products']['Row']

const ITEMS_PER_PAGE = 12

function ProductsContent() {
  const { t } = useLanguage()
  const { region } = useRegion()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [soldOutProducts, setSoldOutProducts] = useState<Product[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSoldOutLoading, setIsSoldOutLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [mounted, setMounted] = useState(false)
  const [productDiscounts, setProductDiscounts] = useState<Map<string, any>>(new Map())
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Debounce search input to reduce API calls
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [searchQuery])

  // Fetch discounts only for products currently displayed on the page
  useEffect(() => {
    const allProductIds = [
      ...products.map(p => p.id),
      ...soldOutProducts.map(p => p.id)
    ]
    if (allProductIds.length === 0) return

    const fetchDiscounts = async () => {
      try {
        const now = new Date().toISOString()
        const { data: discounts, error } = await supabase
          .from('discount_products')
          .select(`
            product_id,
            variant_id,
            discounted_price,
            discounts!inner(
              id,
              start_date,
              end_date,
              is_active
            )
          `)
          .eq('is_active', true)
          .eq('discounts.is_active', true)
          .lte('discounts.start_date', now)
          .gte('discounts.end_date', now)
          .in('product_id', allProductIds)

        if (!error && discounts) {
          const discountMap = new Map()
          const productGroups = new Map()
          
          discounts.forEach(discount => {
            if (!productGroups.has(discount.product_id)) {
              productGroups.set(discount.product_id, [])
            }
            productGroups.get(discount.product_id).push(discount)
          })
          
          productGroups.forEach((productDiscounts, productId) => {
            const minDiscount = productDiscounts.reduce((min: any, current: any) => 
              current.discounted_price < min.discounted_price ? current : min
            )
            discountMap.set(productId, minDiscount)
          })
          
          setProductDiscounts(discountMap)
        }
      } catch (error) {
        console.error('Error fetching discounts:', error)
      }
    }

    fetchDiscounts()
  }, [products, soldOutProducts])

  const category = searchParams.get('category') || undefined
  const collection = searchParams.get('collection') || undefined
  const isNew = searchParams.get('new') || undefined
  const filter = searchParams.get('filter') || undefined
  const gender = searchParams.get('gender') || undefined
  const sort = searchParams.get('sort') || undefined
  const page = searchParams.get('page') || '1'
  
  const currentPage = parseInt(page)
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  useEffect(() => {
    async function fetchProducts() {
      setIsLoading(true)
      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1

      let productIds: string[] | null = null

      // For newest filter, use products_new_status view like homepage
      if (filter === 'newest') {
        const { data: newProducts } = await supabase
          .from('products_new_status')
          .select('id')
          .eq('is_new_final', true)
        
        if (newProducts && newProducts.length > 0) {
          productIds = newProducts.map(p => p.id)
        } else {
          productIds = [] // No new products
        }
      }

      const now = new Date().toISOString()
      const isPriceSorting = sort?.startsWith('price-')

      let query = supabase.from('products').select('*', { count: 'exact' })
        .eq('is_visible', true)
        .eq('is_archived', false)
        .eq('status', 'active')
        .or(`scheduled_publish_date.is.null,scheduled_publish_date.lte.${now}`)

      // When price sorting, include both in-stock and sold-out in one query
      if (isPriceSorting) {
        query = query.gte('stock_quantity', 0)
      } else {
        query = query.gt('stock_quantity', 0)
      }

      // Apply filter (like homepage)
      if (filter === 'popular') {
        query = query.eq('is_popular', true)
      } else if (filter === 'best-selling') {
        query = query.eq('is_best_selling', true)
      } else if (filter === 'newest' && productIds) {
        if (productIds.length === 0) {
          // No new products, return empty
          setProducts([])
          setTotalCount(0)
          setIsLoading(false)
          return
        }
        query = query.in('id', productIds)
      }

      if (category) {
        query = query.eq('fragrance_family', category)
      }

      if (collection) {
        query = query.eq('collection', collection)
      }

      if (isNew === 'true') {
        query = query.eq('is_new', true)
      }

      if (gender === 'male') {
        query = query.or('gender.ilike.male,gender.ilike.men')
      } else if (gender === 'female') {
        query = query.or('gender.ilike.female,gender.ilike.women')
      } else if (gender) {
        query = query.ilike('gender', gender)
      }

      if (debouncedSearchQuery.trim()) {
        query = query.or(`name.ilike.%${debouncedSearchQuery}%,description.ilike.%${debouncedSearchQuery}%`)
      }

      // Apply sorting at DB level
      if (sort === 'price-asc') {
        const priceCol = region?.code === 'ID' ? 'price_idr' : 'price_usd'
        query = query.order(priceCol, { ascending: true })
      } else if (sort === 'price-desc') {
        const priceCol = region?.code === 'ID' ? 'price_idr' : 'price_usd'
        query = query.order(priceCol, { ascending: false })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      // Always apply pagination
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
  }, [category, collection, isNew, filter, gender, sort, currentPage, debouncedSearchQuery, region])

  useEffect(() => {
    // Skip sold-out fetch when price sorting (products query already includes them)
    if (sort?.startsWith('price-')) {
      setSoldOutProducts([])
      setIsSoldOutLoading(false)
      return
    }

    async function fetchSoldOutProducts() {
      setIsSoldOutLoading(true)

      // Skip if hide_sold_out_products is enabled
      const hideSoldOut = await checkFeatureClient('hide_sold_out_products')
      if (hideSoldOut) {
        setSoldOutProducts([])
        setIsSoldOutLoading(false)
        return
      }

      const now = new Date().toISOString()

      let query = supabase.from('products').select('*')
        .eq('is_visible', true)
        .eq('is_archived', false)
        .eq('status', 'active')
        .eq('stock_quantity', 0)
        .or(`scheduled_publish_date.is.null,scheduled_publish_date.lte.${now}`)

      if (category) {
        query = query.eq('fragrance_family', category)
      }

      if (collection) {
        query = query.eq('collection', collection)
      }

      if (gender === 'male') {
        query = query.or('gender.ilike.male,gender.ilike.men')
      } else if (gender === 'female') {
        query = query.or('gender.ilike.female,gender.ilike.women')
      } else if (gender) {
        query = query.ilike('gender', gender)
      }

      if (debouncedSearchQuery.trim()) {
        query = query.or(`name.ilike.%${debouncedSearchQuery}%,description.ilike.%${debouncedSearchQuery}%`)
      }

      query = query.order('created_at', { ascending: false })
        .limit(12)

      const { data, error } = await query as { data: Product[] | null; error: any }

      if (error || !data) {
        console.error('Error fetching sold-out products:', error)
        setSoldOutProducts([])
      } else {
        setSoldOutProducts(data)
      }
      setIsSoldOutLoading(false)
    }

    fetchSoldOutProducts()
  }, [category, collection, gender, debouncedSearchQuery, sort])

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
      {/* Luxury Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 pt-6 pb-6 md:pt-8 md:pb-8">
          {/* Breadcrumb - Desktop only */}
          <div className="mb-4 hidden md:block">
            <Breadcrumbs
              items={[
                { label: t.common.products, href: '/products' }
              ]}
            />
          </div>
          <h1 className="font-playfair text-3xl font-bold tracking-[0.05em] text-luxury-navy md:text-4xl lg:text-5xl">
            {t.productsPage.allFragrances}
          </h1>

          {/* Underline search bar */}
          <div className="mt-6 max-w-sm">
            <div className="relative flex items-center border-b border-gray-300 focus-within:border-[#B8985F] transition-colors duration-200">
              <svg
                className="h-4 w-4 text-gray-400 mr-3 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={t.productsPage.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent py-2 text-sm font-montserrat text-gray-700 placeholder:text-gray-400 placeholder:font-montserrat focus:outline-none tracking-wide"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600 transition-colors ml-2">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-3 md:px-6 md:py-4 lg:px-8 pb-20">
        {/* Filter Controls - Sticky (Mobile Only) */}
        <div className="sticky top-0 z-10 bg-white pt-3 pb-0 mb-4 lg:hidden">
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide border-b border-gray-100">
            {([
              { label: t.productsPage.sort.popular, active: filter === 'popular', onClick: () => { const p = new URLSearchParams(searchParams.toString()); filter === 'popular' ? p.delete('filter') : p.set('filter', 'popular'); router.push(`/products?${p.toString()}`) } },
              { label: 'Men', active: gender === 'male', onClick: () => { const p = new URLSearchParams(searchParams.toString()); gender === 'male' ? p.delete('gender') : p.set('gender', 'male'); router.push(`/products?${p.toString()}`) } },
              { label: 'Women', active: gender === 'female', onClick: () => { const p = new URLSearchParams(searchParams.toString()); gender === 'female' ? p.delete('gender') : p.set('gender', 'female'); router.push(`/products?${p.toString()}`) } },
              { label: 'Unisex', active: gender === 'unisex', onClick: () => { const p = new URLSearchParams(searchParams.toString()); gender === 'unisex' ? p.delete('gender') : p.set('gender', 'unisex'); router.push(`/products?${p.toString()}`) } },
              { label: t.productsPage.sort.newest, active: filter === 'newest', onClick: () => { const p = new URLSearchParams(searchParams.toString()); filter === 'newest' ? p.delete('filter') : p.set('filter', 'newest'); router.push(`/products?${p.toString()}`) } },
              { label: `${t.productsPage.price} ${sort === 'price-desc' ? '↓' : '↑'}`, active: !!sort?.startsWith('price-'), onClick: () => { const p = new URLSearchParams(searchParams.toString()); p.set('sort', sort === 'price-asc' ? 'price-desc' : 'price-asc'); router.push(`/products?${p.toString()}`) } },
            ] as { label: string; active: boolean; onClick: () => void }[]).map(({ label, active, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                className={`relative flex-shrink-0 px-4 py-1.5 text-[11px] font-montserrat font-semibold uppercase tracking-[0.12em] transition-all duration-200 whitespace-nowrap ${
                  active
                    ? 'text-[#B8985F] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#B8985F] after:rounded-full'
                    : 'text-gray-500 hover:text-luxury-navy'
                }`}
              >
                {label}
              </button>
            ))}
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
            ) : products.length > 0 || soldOutProducts.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-2 lg:gap-5 xl:grid-cols-3">
                  {products.map((product: Product) => {
                    const discount = productDiscounts.get(product.id)
                    return (
                      <ProductCard 
                        key={product.id} 
                        product={product}
                        activeDiscount={discount || null}
                        noBorder
                      />
                    )
                  })}
                </div>
                <Pagination currentPage={currentPage} totalPages={totalPages} totalCount={totalCount} itemsPerPage={ITEMS_PER_PAGE} />

                {/* Sold Out Section - hidden when price sorting (already included in main grid) */}
                {!sort?.startsWith('price-') && soldOutProducts.length > 0 && (
                  <div className="mt-12 md:mt-16">
                    <div className="mb-6 border-t border-gray-200 pt-8">
                      <h2 className="font-playfair text-3xl font-bold tracking-[0.05em] text-luxury-navy md:text-4xl lg:text-5xl">
                        {t.productsPage.soldOut}
                      </h2>
                      <p className="mt-2 text-sm font-montserrat text-gray-500 font-semibold">
                        {t.productsPage.soldOutDescription}
                      </p>
                    </div>
                    {isSoldOutLoading ? (
                      <div className="flex min-h-[200px] items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-luxury-navy"></div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-2 lg:gap-5 xl:grid-cols-3">
                        {soldOutProducts.map((product: Product) => {
                          const discount = productDiscounts.get(product.id)
                          return (
                            <ProductCard 
                              key={product.id} 
                              product={product}
                              activeDiscount={discount || null}
                              noBorder
                            />
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
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
