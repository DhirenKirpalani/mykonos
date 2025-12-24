import { HeroCarousel } from '@/components/hero-carousel'
import { CategorySection } from '@/components/category-section'
import { ProductCarousel } from '@/components/product-carousel'
import { CollectionCard } from '@/components/collection-card'
import { ScrollReveal } from '@/components/scroll-reveal'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(8)

  if (error) {
    console.error('Error fetching products:', error)
    return []
  }

  return data
}

async function getCollections() {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .order('display_order', { ascending: true })

  if (error) {
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
    .limit(6)

  if (error) {
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
    <div className="min-h-screen">
      <HeroCarousel />

      <CategorySection />

      {newArrivals.length > 0 && (
        <ProductCarousel title="New Arrivals" products={newArrivals} />
      )}

      <section className="relative bg-luxury-gray-light py-24 lg:py-32">
        <div className="container mx-auto px-4 lg:px-8">
          <ScrollReveal>
            <div className="mb-16 text-center">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-luxury-gold">
                Curated Excellence
              </p>
              <h2 className="mb-6 font-serif text-4xl font-bold lg:text-5xl">
                Our Collections
              </h2>
              <p className="mx-auto max-w-2xl text-base text-gray-600 lg:text-lg">
                Explore our curated collections, each designed to capture a unique
                essence and emotion.
              </p>
            </div>
          </ScrollReveal>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection, index) => (
              <ScrollReveal key={collection.id} delay={index * 100}>
                <CollectionCard collection={collection} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {products.length > 0 && (
        <ProductCarousel title="Trending Now" products={products} />
      )}

      <section className="relative bg-luxury-navy py-32 text-white lg:py-40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_rgba(255,255,255,0.05)_1px,_transparent_0)] bg-[length:40px_40px]" />
        <div className="container relative mx-auto px-4 text-center lg:px-8">
          <ScrollReveal>
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.3em] text-luxury-gold">
              The Art of Perfumery
            </p>
            <h2 className="mb-6 font-serif text-4xl font-bold lg:text-6xl">
              Experience Luxury
            </h2>
            <p className="mx-auto mb-12 max-w-3xl text-lg text-gray-300 lg:text-xl">
              Each fragrance is a masterpiece, meticulously crafted to evoke
              emotions and create lasting memories.
            </p>
            <Link href="/about">
              <Button
                size="lg"
                className="border-2 border-luxury-gold bg-luxury-gold px-8 py-6 text-base font-medium uppercase tracking-wider text-luxury-navy transition-all hover:bg-white hover:text-luxury-navy hover:border-white"
              >
                Discover Our Story
              </Button>
            </Link>
          </ScrollReveal>
        </div>
      </section>

      <section className="bg-white py-24 lg:py-32">
        <div className="container mx-auto px-4 lg:px-8">
          <ScrollReveal>
            <div className="mb-16 text-center">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-luxury-gold">
                Why Choose Mykonos
              </p>
              <h2 className="font-serif text-3xl font-bold lg:text-4xl">
                Uncompromising Excellence
              </h2>
            </div>
          </ScrollReveal>
          <div className="grid gap-12 md:grid-cols-3 lg:gap-16">
            <ScrollReveal delay={0}>
              <div className="group text-center">
              <div className="mb-6 flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-luxury-gold/20 bg-luxury-gold/5 transition-all duration-500 group-hover:border-luxury-gold group-hover:bg-luxury-gold/10">
                  <svg
                    className="h-10 w-10 text-luxury-gold transition-transform duration-500 group-hover:scale-110"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="mb-3 font-serif text-xl font-bold lg:text-2xl">
                Premium Quality
              </h3>
              <p className="text-gray-600">
                Only the finest ingredients sourced from around the world
              </p>
            </div>
            </ScrollReveal>
            <ScrollReveal delay={150}>
              <div className="group text-center">
                <div className="mb-6 flex justify-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-luxury-gold/20 bg-luxury-gold/5 transition-all duration-500 group-hover:border-luxury-gold group-hover:bg-luxury-gold/10">
                    <svg
                      className="h-10 w-10 text-luxury-gold transition-transform duration-500 group-hover:scale-110"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                      />
                    </svg>
                  </div>
                </div>
                <h3 className="mb-3 font-serif text-xl font-bold lg:text-2xl">
                  Complimentary Gift Wrapping
                </h3>
                <p className="text-gray-600">
                  Every order arrives beautifully packaged
                </p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={300}>
              <div className="group text-center">
                <div className="mb-6 flex justify-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-luxury-gold/20 bg-luxury-gold/5 transition-all duration-500 group-hover:border-luxury-gold group-hover:bg-luxury-gold/10">
                    <svg
                      className="h-10 w-10 text-luxury-gold transition-transform duration-500 group-hover:scale-110"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                </div>
                <h3 className="mb-3 font-serif text-xl font-bold lg:text-2xl">
                  Free Shipping
                </h3>
                <p className="text-gray-600">
                  On all orders over $150
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </div>
  )
}
