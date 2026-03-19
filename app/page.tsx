'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ResponsiveLayout } from '@/components/responsive-layout'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/database.types'

type Product = Database['public']['Tables']['products']['Row']
type Collection = Database['public']['Tables']['collections']['Row']

export default function HomePage() {
  const router = useRouter()
  const [shouldRender, setShouldRender] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [newArrivals, setNewArrivals] = useState<Product[]>([])
  const [bestSelling, setBestSelling] = useState<Product[]>([])
  
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
      const [productsResult, collectionsResult, newArrivalsResult, bestSellingResult] = await Promise.all([
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
          .from('products')
          .select('*')
          .eq('is_visible', true)
          .eq('is_new', true)
          .limit(8),
        supabase
          .from('products')
          .select('*')
          .eq('is_visible', true)
          .eq('is_best_selling', true)
          .limit(8)
      ])

      setProducts((productsResult.data || []) as unknown as Product[])
      setCollections((collectionsResult.data || []) as unknown as Collection[])
      setNewArrivals((newArrivalsResult.data || []) as unknown as Product[])
      setBestSelling((bestSellingResult.data || []) as unknown as Product[])
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }
  
  if (!shouldRender) {
    return null
  }

  return (
    <ResponsiveLayout 
      products={products}
      collections={collections}
      newArrivals={newArrivals}
      bestSelling={bestSelling}
    />
  )
}
