'use client'

import dynamic from 'next/dynamic'
import { HeroCarousel } from '@/components/hero-carousel'
import { Database } from '@/lib/supabase/database.types'

const ProductCarousel = dynamic(() => import('@/components/product-carousel').then(mod => ({ default: mod.ProductCarousel })), {
  loading: () => <div className="h-96 bg-gradient-to-b from-[#1a1a2e] to-[#16213e] animate-pulse" />,
  ssr: false
})

const CategorySection = dynamic(() => import('@/components/category-section').then(mod => ({ default: mod.CategorySection })), {
  loading: () => <div className="h-80 bg-gradient-to-b from-[#e8dcc4] to-[#f5f0e8] animate-pulse" />,
  ssr: false
})

const CollectionCard = dynamic(() => import('@/components/collection-card').then(mod => ({ default: mod.CollectionCard })))
const ScrollReveal = dynamic(() => import('@/components/scroll-reveal').then(mod => ({ default: mod.ScrollReveal })))

import Link from 'next/link'
import { Button } from '@/components/ui/button'

type Product = Database['public']['Tables']['products']['Row']
type Collection = Database['public']['Tables']['collections']['Row']

interface HomeMobileProps {
  products: Product[]
  collections: Collection[]
  newArrivals: Product[]
}

export function HomeMobile({ products, collections, newArrivals }: HomeMobileProps) {
  return (
    <div className="min-h-screen">
      <HeroCarousel />

      {newArrivals.length > 0 && (
        <ProductCarousel 
          title="New Arrivals" 
          products={newArrivals}
          backgroundColor="bg-gradient-to-b from-[#C2A36B] to-[#B8945E]"
          titleColor="text-[#1C2E4A]"
        />
      )}

      {products.length > 0 && (
        <ProductCarousel 
          title="Trending Now" 
          products={products}
          backgroundColor="bg-gradient-to-b from-[#1E3456] to-[#142A46]"
          titleColor="text-[#C2A36B]/90"
        />
      )}

      <CategorySection />

      <section className="relative bg-[#F6F4EF] py-12">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="mb-8 text-center">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.25em] text-[#8A6A3F]/75">
                Curated Excellence
              </p>
              <h2 className="mb-4 font-serif text-2xl font-bold text-[#1C2E4A]">
                Our Collections
              </h2>
              <p className="mx-auto max-w-2xl text-sm text-[#5A4A3A]/90">
                Explore our curated collections, each designed to capture a unique
                essence and emotion.
              </p>
            </div>
          </ScrollReveal>
          <div className="grid gap-4 grid-cols-1">
            {collections.map((collection, index) => (
              <ScrollReveal key={collection.id} delay={index * 100}>
                <CollectionCard collection={collection} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="relative bg-luxury-navy py-16 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_rgba(255,255,255,0.05)_1px,_transparent_0)] bg-[length:40px_40px]" />
        <div className="container relative mx-auto px-4 text-center">
          <ScrollReveal>
            <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.25em] text-luxury-gold">
              The Art of Perfumery
            </p>
            <h2 className="mb-4 font-serif text-2xl font-bold">
              Experience Luxury
            </h2>
            <p className="mx-auto mb-8 max-w-3xl text-sm text-gray-300">
              Each fragrance is a masterpiece, meticulously crafted to evoke
              emotions and create lasting memories.
            </p>
            <Link href="/about">
              <Button
                size="lg"
                className="border-2 border-luxury-gold bg-luxury-gold px-6 py-3 text-sm font-medium uppercase tracking-wider text-luxury-navy transition-all hover:bg-white hover:text-luxury-navy hover:border-white"
              >
                Discover Our Story
              </Button>
            </Link>
          </ScrollReveal>
        </div>
      </section>

      <section className="bg-white py-12">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="mb-8 text-center">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.25em] text-luxury-gold">
                Why Choose Mykonos
              </p>
              <h2 className="font-serif text-2xl font-bold">
                Uncompromising Excellence
              </h2>
            </div>
          </ScrollReveal>
          <div className="space-y-8">
            <ScrollReveal delay={0}>
              <div className="group text-center">
              <div className="mb-6 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-luxury-gold/20 bg-luxury-gold/5 transition-all duration-500 group-hover:border-luxury-gold group-hover:bg-luxury-gold/10">
                  <svg
                    className="h-8 w-8 text-luxury-gold transition-transform duration-500 group-hover:scale-110"
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
              <h3 className="mb-3 font-serif text-lg font-bold">
                Premium Quality
              </h3>
              <p className="text-sm text-gray-600">
                Only the finest ingredients sourced from around the world
              </p>
            </div>
            </ScrollReveal>
            <ScrollReveal delay={150}>
              <div className="group text-center">
                <div className="mb-6 flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-luxury-gold/20 bg-luxury-gold/5 transition-all duration-500 group-hover:border-luxury-gold group-hover:bg-luxury-gold/10">
                    <svg
                      className="h-8 w-8 text-luxury-gold transition-transform duration-500 group-hover:scale-110"
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
                <h3 className="mb-3 font-serif text-lg font-bold">
                  Complimentary Gift Wrapping
                </h3>
                <p className="text-sm text-gray-600">
                  Every order arrives beautifully packaged
                </p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={300}>
              <div className="group text-center">
                <div className="mb-6 flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-luxury-gold/20 bg-luxury-gold/5 transition-all duration-500 group-hover:border-luxury-gold group-hover:bg-luxury-gold/10">
                    <svg
                      className="h-8 w-8 text-luxury-gold transition-transform duration-500 group-hover:scale-110"
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
                <h3 className="mb-3 font-serif text-lg font-bold">
                  Free Shipping
                </h3>
                <p className="text-sm text-gray-600">
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
