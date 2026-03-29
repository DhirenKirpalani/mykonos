'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ResponsiveLayout } from '@/components/responsive-layout'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/database.types'

type Product = Database['public']['Tables']['products']['Row']
type Collection = Database['public']['Tables']['collections']['Row']

function HomePageSkeleton() {
  return (
    <div className="min-h-screen animate-pulse">
      {/* Hero skeleton */}
      <div className="h-[35vh] sm:h-[40vh] md:h-[60vh] lg:h-[75vh] bg-gray-900" />

      {/* Carousel skeleton × 3 */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="py-10 px-4" style={{ background: i === 2 ? '#1C2E4A' : i === 3 ? '#C2A36B' : '#F5EFE6' }}>
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto mb-8 h-6 w-36 rounded bg-white/20" />
            <div className="flex gap-4 overflow-hidden">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="flex-shrink-0 w-[42vw] max-w-[160px] md:w-[260px]">
                  <div className="rounded-lg overflow-hidden">
                    <div className="aspect-square bg-white/20" />
                    <div className="p-3 space-y-2">
                      <div className="h-4 w-3/4 rounded bg-white/20" />
                      <div className="h-4 w-1/2 rounded bg-white/20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()
  const [shouldRender, setShouldRender] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [newArrivals, setNewArrivals] = useState<Product[]>([])
  const [bestSelling, setBestSelling] = useState<Product[]>([])
  const [vouchers, setVouchers] = useState<any[]>([])
  
  useEffect(() => {
    // Check if user has visited before
    const hasVisited = localStorage.getItem('visited')
    
    if (!hasVisited) {
      // First visit - set flag and redirect
      localStorage.setItem('visited', 'true')
      router.replace('/products')
    } else {
      // User has visited before - show homepage
      setShouldRender(true)
      fetchData()
    }
  }, [router])

  const fetchData = async () => {
    try {
      // Fetch all data in parallel for better performance
      const [productsResult, collectionsResult, newArrivalsResult, bestSellingResult, vouchersResult] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('is_visible', true)
          .eq('is_popular', true)
          .limit(8),
        supabase
          .from('collections')
          .select('*')
          .limit(6),
        supabase
          .from('products_new_status')
          .select(`
            id,
            name,
            slug,
            created_at,
            is_new_manual,
            new_product_duration_days,
            is_new_computed,
            is_new_final
          `)
          .eq('is_new_final', true)
          .order('created_at', { ascending: false })
          .limit(8)
          .then(async (result) => {
            if (result.data) {
              // Fetch full product details for products that are "new"
              const productIds = result.data.map(p => p.id)
              return supabase
                .from('products')
                .select('*')
                .in('id', productIds)
                .eq('is_visible', true)
            }
            return result
          }),
        supabase
          .from('products')
          .select('*')
          .eq('is_visible', true)
          .eq('is_best_selling', true)
          .limit(8),
        supabase
          .from('promo_codes')
          .select('discount_type, discount_value, scope, applicable_product_ids, valid_until')
          .eq('is_active', true)
          .lte('valid_from', new Date().toISOString())
          .gte('valid_until', new Date().toISOString())
      ])

      setProducts((productsResult.data || []) as unknown as Product[])
      setCollections((collectionsResult.data || []) as unknown as Collection[])
      setNewArrivals((newArrivalsResult.data || []) as unknown as Product[])
      setBestSelling((bestSellingResult.data || []) as unknown as Product[])
      setVouchers(vouchersResult.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  if (!shouldRender) {
    return <HomePageSkeleton />
  }

  return (
    <ResponsiveLayout 
      products={products}
      collections={collections}
      newArrivals={newArrivals}
      bestSelling={bestSelling}
      vouchers={vouchers}
      isLoading={isLoading}
    />
  )
}
