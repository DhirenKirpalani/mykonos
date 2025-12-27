'use client'

import dynamic from 'next/dynamic'
import { HeroCarousel } from '@/components/hero-carousel'
import { Database } from '@/lib/supabase/database.types'

const ProductCarousel = dynamic(() => import('@/components/product-carousel').then(mod => ({ default: mod.ProductCarousel })), {
  loading: () => <div className="h-96 bg-gradient-to-b from-[#1a1a2e] to-[#16213e] animate-pulse" />,
  ssr: false
})

const CategorySection = dynamic(() => import('@/components/category-section').then(mod => ({ default: mod.CategorySection })), {
  loading: () => <div className="h-96 bg-gradient-to-b from-[#e8dcc4] to-[#f5f0e8] animate-pulse" />,
  ssr: false
})

const CollectionCard = dynamic(() => import('@/components/collection-card').then(mod => ({ default: mod.CollectionCard })))
const ScrollReveal = dynamic(() => import('@/components/scroll-reveal').then(mod => ({ default: mod.ScrollReveal })))

import Link from 'next/link'
import { Button } from '@/components/ui/button'

type Product = Database['public']['Tables']['products']['Row']
type Collection = Database['public']['Tables']['collections']['Row']

interface HomeDesktopProps {
  products: Product[]
  collections: Collection[]
  newArrivals: Product[]
}

export function HomeDesktop({ products, collections, newArrivals }: HomeDesktopProps) {
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

      <section className="relative bg-[#F6F4EF] py-12 md:py-20 lg:py-32">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <ScrollReveal>
            <div className="mb-8 text-center md:mb-12 lg:mb-16">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.25em] text-[#8A6A3F]/75 md:mb-3 md:text-xs md:tracking-[0.3em]">
                Curated Excellence
              </p>
              <h2 className="mb-4 font-serif text-2xl font-bold text-[#1C2E4A] md:mb-6 md:text-3xl lg:text-5xl">
                Our Collections
              </h2>
              <p className="mx-auto max-w-2xl text-sm text-[#5A4A3A]/90 md:text-base lg:text-lg">
                Explore our curated collections, each designed to capture a unique
                essence and emotion.
              </p>
            </div>
          </ScrollReveal>
          <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {collections.map((collection, index) => (
              <ScrollReveal key={collection.id} delay={index * 100}>
                <CollectionCard collection={collection} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="relative bg-luxury-navy py-16 text-white md:py-24 lg:py-40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_rgba(255,255,255,0.05)_1px,_transparent_0)] bg-[length:40px_40px]" />
        <div className="container relative mx-auto px-4 text-center md:px-6 lg:px-8">
          <ScrollReveal>
            <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.25em] text-luxury-gold md:mb-4 md:text-xs md:tracking-[0.3em]">
              The Art of Perfumery
            </p>
            <h2 className="mb-4 font-serif text-2xl font-bold md:mb-6 md:text-4xl lg:text-6xl">
              Experience Luxury
            </h2>
            <p className="mx-auto mb-8 max-w-3xl text-sm text-gray-300 md:mb-12 md:text-base lg:text-xl">
              Each fragrance is a masterpiece, meticulously crafted to evoke
              emotions and create lasting memories.
            </p>
            <Link href="/about">
              <Button
                size="lg"
                className="border-2 border-luxury-gold bg-luxury-gold px-6 py-3 text-sm font-medium uppercase tracking-wider text-luxury-navy transition-all hover:bg-white hover:text-luxury-navy hover:border-white md:px-8 md:py-6 md:text-base"
              >
                Discover Our Story
              </Button>
            </Link>
          </ScrollReveal>
        </div>
      </section>

      <section className="bg-white py-12 md:py-20 lg:py-32">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <ScrollReveal>
            <div className="mb-8 text-center md:mb-12 lg:mb-16">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.25em] text-[#8A6A3F]/75 md:mb-3 md:text-xs md:tracking-[0.3em]">
                Why Choose Mykonos
              </p>
              <h2 className="font-serif text-2xl font-bold text-[#1C2E4A] md:text-3xl lg:text-4xl">
                Uncompromising Excellence
              </h2>
            </div>
          </ScrollReveal>
          <div className="grid gap-8 md:grid-cols-3 md:gap-10 lg:gap-16">
            <ScrollReveal delay={0}>
              <div className="group text-center">
              <div className="mb-6 flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#E6DDCF] bg-transparent transition-all duration-500 group-hover:border-[#C2A36B]">
                  <svg
                    className="h-10 w-10 text-[#8A6A3F] transition-transform duration-500 group-hover:scale-110"
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
              <h3 className="mb-3 font-serif text-xl font-bold text-[#1C2E4A] lg:text-2xl">
                Premium Quality
              </h3>
              <p className="text-[#5A4A3A]/90">
                Only the finest ingredients sourced from around the world
              </p>
            </div>
            </ScrollReveal>
            <ScrollReveal delay={150}>
              <div className="group text-center">
                <div className="mb-6 flex justify-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#E6DDCF] bg-transparent transition-all duration-500 group-hover:border-[#C2A36B]">
                    <svg
                      className="h-10 w-10 text-[#8A6A3F] transition-transform duration-500 group-hover:scale-110"
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
                <h3 className="mb-3 font-serif text-xl font-bold text-[#1C2E4A] lg:text-2xl">
                  Complimentary Gift Wrapping
                </h3>
                <p className="text-[#5A4A3A]/90">
                  Every order arrives beautifully packaged
                </p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={300}>
              <div className="group text-center">
                <div className="mb-6 flex justify-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#E6DDCF] bg-transparent transition-all duration-500 group-hover:border-[#C2A36B]">
                    <svg
                      className="h-10 w-10 text-[#8A6A3F] transition-transform duration-500 group-hover:scale-110"
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
                <h3 className="mb-3 font-serif text-xl font-bold text-[#1C2E4A] lg:text-2xl">
                  Free Shipping
                </h3>
                <p className="text-[#5A4A3A]/90">
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
