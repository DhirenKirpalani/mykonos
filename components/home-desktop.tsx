'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { HeroCarousel } from '@/components/hero-carousel'
import { Database } from '@/lib/supabase/database.types'
import { useLanguage } from '@/contexts/LanguageContext'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

// Lazy load heavy components with better loading states
const ProductCarousel = dynamic(() => import('@/components/product-carousel').then(mod => ({ default: mod.ProductCarousel })), {
  loading: () => <div className="h-96 animate-pulse bg-gradient-to-b from-gray-200 to-gray-100" />,
  ssr: false // Disable SSR for carousels to reduce initial bundle
})

const ScrollReveal = dynamic(() => import('@/components/scroll-reveal').then(mod => ({ default: mod.ScrollReveal })), {
  ssr: false,
  loading: () => <div className="min-h-[200px]" />
})

type Product = Database['public']['Tables']['products']['Row']
type Collection = Database['public']['Tables']['collections']['Row']

interface HomeDesktopProps {
  products: Product[]
  collections: Collection[]
  newArrivals: Product[]
  bestSelling: Product[]
  vouchers: any[]
  activeDiscounts?: Map<string, any>
  isLoading?: boolean
}

function CarouselSkeleton({ bg, titleBg }: { bg: string; titleBg: string }) {
  return (
    <section className={`relative ${bg} py-8 md:py-12 lg:py-16`}>
      <div className="mx-auto max-w-7xl px-3 md:px-6 lg:px-8 animate-pulse">
        <div className={`mx-auto mb-8 h-6 w-36 rounded ${titleBg}`} />
        <div className="flex gap-4 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[260px] lg:w-[300px]">
              <div className="rounded-lg overflow-hidden">
                <div className={`aspect-square ${titleBg}`} />
                <div className="p-3 space-y-2">
                  <div className={`h-4 w-3/4 rounded ${titleBg}`} />
                  <div className={`h-4 w-1/2 rounded ${titleBg}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function GenderCarouselSection({ genders, vouchers, activeDiscounts }: {
  genders: { label: string; products: Product[]; href: string }[]
  vouchers: any[]
  activeDiscounts?: Map<string, any>
}) {
  const available = genders.filter(g => g.products.length > 0)
  const [active, setActive] = useState(available[0]?.label ?? '')
  const current = available.find(g => g.label === active) ?? available[0]
  if (!available.length) return null
  return (
    <section className="bg-white">
      <div className="text-center pt-8 mb-6 px-4">
        <p className="mb-3 text-sm font-normal uppercase tracking-[0.3em] text-[#333] md:text-base">MUST HAVE</p>
        <h2 className="font-sans uppercase tracking-[0.18em] text-[#1C2E4A] text-3xl font-bold md:text-4xl lg:text-5xl mb-5">
          {active}
        </h2>
        <div className="inline-flex border border-[#e0e0e0]">
          {available.map(({ label }) => (
            <button
              key={label}
              onClick={() => setActive(label)}
              className={`px-6 py-2.5 text-sm font-bold uppercase tracking-[0.15em] transition-all ${
                active === label
                  ? 'bg-[#1C2E4A] text-white'
                  : 'bg-white text-[#1C2E4A] hover:bg-[#1C2E4A]/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {current && (
        <ProductCarousel
          key={active}
          title={active}
          products={current.products}
          backgroundColor="bg-white"
          titleColor="text-[#1C2E4A]"
          variant="bestselling"
          viewAllHref={current.href}
          vouchers={vouchers}
          activeDiscounts={activeDiscounts}
          hideHeader={true}
          noBorders={true}
        />
      )}
    </section>
  )
}

function SizeCarouselSection({ products50ml, products100ml, vouchers, activeDiscounts }: {
  products50ml: Product[]; products100ml: Product[]; vouchers: any[]; activeDiscounts?: Map<string, any>
}) {
  const sizes = [
    ...(products50ml.length > 0 ? [{ label: '50ML', products: products50ml, href: '/products?size=50ml' }] : []),
    ...(products100ml.length > 0 ? [{ label: '100ML', products: products100ml, href: '/products?size=100ml' }] : []),
  ]
  const [active, setActive] = useState(sizes[0]?.label ?? '50ML')
  const current = sizes.find(s => s.label === active) ?? sizes[0]
  return (
    <section className="bg-white pt-8 md:pt-12">
      <div className="text-center mb-6 px-4">
        <p className="mb-3 text-sm font-normal uppercase tracking-[0.3em] text-[#333] md:text-base">SHOP BY SIZE</p>
        <h2 className="font-sans uppercase tracking-[0.18em] text-[#1C2E4A] text-3xl font-bold md:text-4xl lg:text-5xl mb-5">
          {active}
        </h2>
        <div className="inline-flex border border-[#e0e0e0]">
          {sizes.map(({ label }) => (
            <button
              key={label}
              onClick={() => setActive(label)}
              className={`px-8 py-2.5 text-sm font-bold uppercase tracking-[0.15em] transition-all ${
                active === label
                  ? 'bg-[#1C2E4A] text-white'
                  : 'bg-white text-[#1C2E4A] hover:bg-[#1C2E4A]/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {current && (
        <ProductCarousel
          key={active}
          title={active}
          products={current.products}
          backgroundColor="bg-white"
          titleColor="text-[#1C2E4A]"
          variant="bestselling"
          viewAllHref={current.href}
          vouchers={vouchers}
          activeDiscounts={activeDiscounts}
          hideHeader={true}
        />
      )}
    </section>
  )
}

export function HomeDesktop({ products, collections, newArrivals, bestSelling, vouchers, activeDiscounts, isLoading }: HomeDesktopProps) {
  const { t } = useLanguage()

  const maleProducts = products.filter(p => (p as any).gender?.toLowerCase() === 'male' || (p as any).gender?.toLowerCase() === 'men')
  const femaleProducts = products.filter(p => (p as any).gender?.toLowerCase() === 'female' || (p as any).gender?.toLowerCase() === 'women')
  const unisexProducts = products.filter(p => (p as any).gender?.toLowerCase() === 'unisex')
  const products50ml = products.filter(p => {
    const vol = ((p as any).volume || '').toLowerCase()
    const name = (p.name || '').toLowerCase()
    return vol.includes('50') || name.includes('50ml')
  })
  const products100ml = products.filter(p => {
    const vol = ((p as any).volume || '').toLowerCase()
    const name = (p.name || '').toLowerCase()
    return vol.includes('100') || name.includes('100ml')
  })

  return (
    <div className="min-h-screen">
      <HeroCarousel />

      {isLoading ? (
        <CarouselSkeleton bg="bg-[#F2F2F2]" titleBg="bg-[#1C2E4A]/20" />
      ) : bestSelling.length > 0 ? (
        <ProductCarousel
          title={t.home.popular}
          products={bestSelling}
          backgroundColor="bg-white"
          titleColor="text-[#1C2E4A]"
          variant="bestselling"
          viewAllHref="/products?filter=popular"
          vouchers={vouchers}
          activeDiscounts={activeDiscounts}
        />
      ) : null}

      {isLoading ? (
        <CarouselSkeleton bg="bg-white" titleBg="bg-[#1C2E4A]/20" />
      ) : (
        <GenderCarouselSection
          genders={[
            { label: (t.home as any).forMen || 'For Men', products: maleProducts, href: '/products?gender=male' },
            { label: (t.home as any).forWomen || 'For Women', products: femaleProducts, href: '/products?gender=female' },
            { label: (t.home as any).forUnisex || 'Unisex', products: unisexProducts, href: '/products?gender=unisex' },
          ]}
          vouchers={vouchers}
          activeDiscounts={activeDiscounts}
        />
      )}

      {isLoading ? (
        <CarouselSkeleton bg="bg-white" titleBg="bg-[#1C2E4A]/20" />
      ) : (products50ml.length > 0 || products100ml.length > 0) ? (
        <SizeCarouselSection
          products50ml={products50ml}
          products100ml={products100ml}
          vouchers={vouchers}
          activeDiscounts={activeDiscounts}
        />
      ) : null}
    </div>
  )
}
