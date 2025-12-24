import { notFound } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase/client'
import { ProductCard } from '@/components/product-card'
import { Database } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

type Collection = Database['public']['Tables']['collections']['Row']
type Product = Database['public']['Tables']['products']['Row']

async function getCollection(slug: string) {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('slug', slug)
    .single() as { data: Collection | null; error: any }

  if (error || !data) {
    return null
  }

  return data
}

async function getCollectionProducts(collectionName: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('collection', collectionName)
    .order('created_at', { ascending: false }) as { data: Product[] | null; error: any }

  if (error || !data) {
    return []
  }

  return data
}

export default async function CollectionDetailPage({
  params,
}: {
  params: { slug: string }
}) {
  const collection = await getCollection(params.slug)

  if (!collection) {
    notFound()
  }

  const products = await getCollectionProducts(collection.name)

  return (
    <div className="min-h-screen bg-white">
      <div className="relative h-[400px] overflow-hidden">
        <Image
          src={collection.hero_image_url}
          alt={collection.name}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute inset-0 flex items-end">
          <div className="container mx-auto px-4 pb-12 lg:px-8">
            <h1 className="mb-4 font-serif text-4xl font-bold text-white lg:text-6xl">
              {collection.name}
            </h1>
            <p className="max-w-2xl text-lg text-white/90">
              {collection.description}
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 lg:px-8">
        <div className="mb-8">
          <p className="text-muted-foreground">
            {products.length} {products.length === 1 ? 'product' : 'products'}
          </p>
        </div>

        {products.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[400px] items-center justify-center">
            <p className="text-lg text-muted-foreground">
              No products in this collection yet.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
