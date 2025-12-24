import { supabase } from '@/lib/supabase/client'
import { CollectionCard } from '@/components/collection-card'
import { Database } from '@/lib/supabase/database.types'

type Collection = Database['public']['Tables']['collections']['Row']

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

export default async function CollectionsPage() {
  const collections = await getCollections()

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-border/40 bg-luxury-gray-light py-12">
        <div className="container mx-auto px-4 lg:px-8">
          <h1 className="mb-4 font-serif text-4xl font-bold lg:text-5xl">
            Our Collections
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Explore our curated collections, each designed to capture a unique
            essence and emotion. From timeless classics to limited editions.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      </div>
    </div>
  )
}
