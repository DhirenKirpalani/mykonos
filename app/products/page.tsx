import { Suspense } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ProductCard } from '@/components/product-card'
import { ProductFilters } from '@/components/product-filters'
import { Database } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

type Product = Database['public']['Tables']['products']['Row']

async function getProducts(searchParams: {
  category?: string
  collection?: string
  new?: string
  sort?: string
}) {
  let query = supabase.from('products').select('*')

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

  const { data, error } = await query as { data: Product[] | null; error: any }

  if (error || !data) {
    console.error('Error fetching products:', error)
    return []
  }

  return data
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { category?: string; collection?: string; new?: string; sort?: string }
}) {
  const products = await getProducts(searchParams)

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-border/40 bg-luxury-gray-light py-12">
        <div className="container mx-auto px-4 lg:px-8">
          <h1 className="font-serif text-4xl font-bold lg:text-5xl">
            {searchParams.category || searchParams.collection || 'All Fragrances'}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {products.length} {products.length === 1 ? 'product' : 'products'}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          <Suspense fallback={<div className="h-64 w-full animate-pulse rounded-lg bg-gray-100" />}>
            <ProductFilters />
          </Suspense>
          <div>
            {products.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="flex min-h-[400px] items-center justify-center">
                <div className="text-center">
                  <p className="text-lg text-muted-foreground">
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
