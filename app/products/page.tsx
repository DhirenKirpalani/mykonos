'use client'

import { Suspense, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ProductCard } from '@/components/product-card'
import { ProductFilters } from '@/components/product-filters'
import { Pagination } from '@/components/Pagination'
import { Database } from '@/lib/supabase/database.types'
import { useLanguage } from '@/contexts/LanguageContext'
import { useSearchParams } from 'next/navigation'

type Product = Database['public']['Tables']['products']['Row']

const ITEMS_PER_PAGE = 12

function ProductsContent() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const category = searchParams.get('category') || undefined
  const collection = searchParams.get('collection') || undefined
  const isNew = searchParams.get('new') || undefined
  const sort = searchParams.get('sort') || undefined
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

      switch (sort) {
        case 'price-asc':
          query = query.order('price', { ascending: true })
          break
        case 'price-desc':
          query = query.order('price', { ascending: false })
          break
        case 'name':
          query = query.order('name', { ascending: true })
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
  }, [category, collection, isNew, sort, currentPage])

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-border/40 bg-luxury-gray-light py-8 md:py-10 lg:py-12">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <h1 className="font-serif text-2xl font-bold md:text-3xl lg:text-5xl">
            {category || collection || t.productsPage.allFragrances}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground md:mt-2 md:text-base">
            {totalCount} {totalCount === 1 ? t.productsPage.product : t.productsPage.products}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-12">
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
                <div className="grid grid-cols-3 gap-3 md:gap-4 lg:grid-cols-2 lg:gap-5 xl:grid-cols-3">
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
