import { Suspense } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ProductCard } from '@/components/product-card'
import { ProductFilters } from '@/components/product-filters'
import { Pagination } from '@/components/Pagination'
import { Database } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

type Product = Database['public']['Tables']['products']['Row']

const ITEMS_PER_PAGE = 12

async function getProducts(searchParams: {
  category?: string
  collection?: string
  new?: string
  sort?: string
  page?: string
}) {
  const page = parseInt(searchParams.page || '1')
  const from = (page - 1) * ITEMS_PER_PAGE
  const to = from + ITEMS_PER_PAGE - 1

  let query = supabase.from('products').select('*', { count: 'exact' })

  if (searchParams.category) {
    query = query.eq('category', searchParams.category)
  }

  if (searchParams.collection) {
    query = query.eq('collection', searchParams.collection)
  }

  if (searchParams.new === 'true') {
    query = query.eq('is_new', true)
  }

  switch (searchParams.sort) {
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
    return { products: [], totalCount: 0 }
  }

  return { products: data, totalCount: count || 0 }
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { category?: string; collection?: string; new?: string; sort?: string; page?: string }
}) {
  const { products, totalCount } = await getProducts(searchParams)
  const currentPage = parseInt(searchParams.page || '1')
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-border/40 bg-luxury-gray-light py-8 md:py-10 lg:py-12">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <h1 className="font-serif text-2xl font-bold md:text-3xl lg:text-5xl">
            {searchParams.category || searchParams.collection || 'All Fragrances'}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground md:mt-2 md:text-base">
            {totalCount} {totalCount === 1 ? 'product' : 'products'}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-12">
        <div className="grid gap-6 md:gap-8 lg:grid-cols-[260px_1fr]">
          <Suspense fallback={<div className="h-64 w-full animate-pulse rounded-lg bg-gray-100" />}>
            <ProductFilters />
          </Suspense>
          <div>
            {products.length > 0 ? (
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
                    No products found matching your criteria.
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
