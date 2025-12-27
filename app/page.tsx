import { ResponsiveLayout } from '@/components/responsive-layout'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

type Product = Database['public']['Tables']['products']['Row']
type Collection = Database['public']['Tables']['collections']['Row']

async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(8) as { data: Product[] | null; error: any }

  if (error || !data) {
    console.error('Error fetching products:', error)
    return []
  }

  return data
}

async function getCollections() {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .order('display_order', { ascending: true }) as { data: Collection[] | null; error: any }

  if (error || !data) {
    console.error('Error fetching collections:', error)
    return []
  }

  return data
}

async function getNewArrivals() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_new', true)
    .order('created_at', { ascending: false })
    .limit(6) as { data: Product[] | null; error: any }

  if (error || !data) {
    console.error('Error fetching new arrivals:', error)
    return []
  }

  return data
}

export default async function HomePage() {
  const [products, collections, newArrivals] = await Promise.all([
    getProducts(),
    getCollections(),
    getNewArrivals(),
  ])

  return (
    <ResponsiveLayout 
      products={products} 
      collections={collections} 
      newArrivals={newArrivals} 
    />
  )
}
