'use client'

import dynamic from 'next/dynamic'
import { HeroCarousel } from '@/components/hero-carousel'
import { FragranceFamiliesGrid } from '@/components/fragrance-families-grid'
import { Database } from '@/lib/supabase/database.types'
import { useLanguage } from '@/contexts/LanguageContext'

const ProductCarousel = dynamic(() => import('@/components/product-carousel').then(mod => ({ default: mod.ProductCarousel })), {
  loading: () => <div className="h-96 animate-pulse bg-gradient-to-b from-gray-200 to-gray-100" />,
  ssr: true
})

const ScrollReveal = dynamic(() => import('@/components/scroll-reveal').then(mod => ({ default: mod.ScrollReveal })), {
  ssr: true
})

import Link from 'next/link'
import { Button } from '@/components/ui/button'

type Product = Database['public']['Tables']['products']['Row']
type Collection = Database['public']['Tables']['collections']['Row']

interface HomeMobileProps {
  products: Product[]
  collections: Collection[]
  newArrivals: Product[]
  bestSelling: Product[]
  vouchers: any[]
  activeDiscounts?: Map<string, any>
  isLoading?: boolean
}

function CarouselSkeletonMobile({ bg, titleBg }: { bg: string; titleBg: string }) {
  return (
    <section className={`relative ${bg} py-8`}>
      <div className="mx-auto max-w-7xl px-3 animate-pulse">
        <div className={`mx-auto mb-6 h-5 w-28 rounded ${titleBg}`} />
        <div className="flex gap-3 overflow-hidden">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[42vw] max-w-[160px]">
              <div className="rounded-lg overflow-hidden">
                <div className={`aspect-square ${titleBg}`} />
                <div className="p-2 space-y-1.5">
                  <div className={`h-3 w-3/4 rounded ${titleBg}`} />
                  <div className={`h-3 w-1/2 rounded ${titleBg}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function HomeMobile({ products, collections, newArrivals, bestSelling, vouchers, activeDiscounts, isLoading }: HomeMobileProps) {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen">
      <HeroCarousel />

      {isLoading ? (
        <CarouselSkeletonMobile bg="bg-gradient-to-br from-[#F5EFE6] via-[#E8DCC4] to-[#D4C5A0]" titleBg="bg-[#1C2E4A]/20" />
      ) : newArrivals.length > 0 ? (
        <section className="relative bg-gradient-to-br from-[#F5EFE6] via-[#E8DCC4] to-[#D4C5A0] py-8">
          <ProductCarousel
            title={t.home.newArrivals}
            products={newArrivals}
            backgroundColor="bg-transparent"
            titleColor="text-[#1C2E4A]"
            variant="new"
            vouchers={vouchers}
            activeDiscounts={activeDiscounts}
          />
        </section>
      ) : null}

      {isLoading ? (
        <CarouselSkeletonMobile bg="bg-gradient-to-br from-[#1C2E4A] via-[#16213E] to-[#0F1729]" titleBg="bg-[#C2A36B]/30" />
      ) : products.length > 0 ? (
        <section className="relative bg-gradient-to-br from-[#1C2E4A] via-[#16213E] to-[#0F1729] py-8">
          <ProductCarousel
            title={t.home.popular}
            products={products}
            backgroundColor="bg-transparent"
            titleColor="text-[#C2A36B]"
            variant="popular"
            vouchers={vouchers}
            activeDiscounts={activeDiscounts}
          />
        </section>
      ) : null}

      {isLoading ? (
        <CarouselSkeletonMobile bg="bg-gradient-to-br from-[#C2A36B] via-[#B8945E] to-[#A67C52]" titleBg="bg-[#1C2E4A]/20" />
      ) : bestSelling.length > 0 ? (
        <section className="relative bg-gradient-to-br from-[#C2A36B] via-[#B8945E] to-[#A67C52] py-8">
          <ProductCarousel
            title={t.home.bestSellers}
            products={bestSelling}
            backgroundColor="bg-transparent"
            titleColor="text-[#1C2E4A]"
            variant="bestselling"
            vouchers={vouchers}
            activeDiscounts={activeDiscounts}
          />
        </section>
      ) : null}

      <FragranceFamiliesGrid />

      <section className="relative bg-white py-16 text-luxury-navy">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_rgba(255,255,255,0.05)_1px,_transparent_0)] bg-[length:40px_40px]" />
        <div className="container relative mx-auto px-4 text-center">
          <ScrollReveal>
            <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.25em] text-luxury-gold/80">
              {t.home.artOfPerfumery}
            </p>
            <h2 className="mb-4 font-serif text-2xl font-bold">
              {t.home.experienceLuxury}
            </h2>
            <p className="mx-auto mb-8 max-w-3xl text-sm text-luxury-navy/80">
              {t.home.experienceLuxuryDesc}
            </p>
            <Link href="/about">
              <Button
                size="lg"
                className="border-2 border-luxury-gold bg-luxury-gold px-6 py-3 text-sm font-medium uppercase tracking-wider text-luxury-navy transition-all hover:border-luxury-navy hover:bg-luxury-navy hover:text-white"
              >
                {t.home.discoverStory}
              </Button>
            </Link>
          </ScrollReveal>
        </div>
      </section>
    </div>
  )
}
