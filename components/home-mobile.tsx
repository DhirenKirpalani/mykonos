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

function GenderCarouselSection({ genders, vouchers, activeDiscounts }: {
  genders: { label: string; tabLabel: string; products: Product[]; href: string }[]
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
        <p className="mb-3 text-sm font-montserrat font-normal uppercase tracking-[0.3em] text-[#333] md:text-base">EXPLORE OUR</p>
        <h2 className="font-playfair uppercase tracking-[0.18em] text-[#1C2E4A] text-xl font-bold md:text-2xl lg:text-3xl mb-5">
          {active}
        </h2>
        <div className="inline-flex border border-[#e0e0e0]">
          {available.map(({ label, tabLabel }) => (
            <button
              key={label}
              onClick={() => setActive(label)}
              className={`px-6 py-2.5 text-sm font-montserrat font-bold uppercase tracking-[0.15em] transition-all ${
                active === label
                  ? 'bg-[#1C2E4A] text-white'
                  : 'bg-white text-[#1C2E4A] hover:bg-[#1C2E4A]/5'
              }`}
            >
              {tabLabel}
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

function SizeCarouselSection({ products15ml, products50ml, products100ml, vouchers, activeDiscounts }: {
  products15ml: Product[]; products50ml: Product[]; products100ml: Product[]; vouchers: any[]; activeDiscounts?: Map<string, any>
}) {
  const sizes = [
    ...(products15ml.length > 0 ? [{ label: '15ML', products: products15ml, href: '/products?size=15ml' }] : []),
    ...(products50ml.length > 0 ? [{ label: '50ML', products: products50ml, href: '/products?size=50ml' }] : []),
    ...(products100ml.length > 0 ? [{ label: '100ML', products: products100ml, href: '/products?size=100ml' }] : []),
  ]
  const [active, setActive] = useState(sizes[0]?.label ?? '15ML')
  const current = sizes.find(s => s.label === active) ?? sizes[0]
  return (
    <section className="bg-white pt-8 md:pt-12">
      <div className="text-center mb-6 px-4">
        <p className="mb-3 text-sm font-montserrat font-normal uppercase tracking-[0.3em] text-[#333] md:text-base">SHOP BY SIZE</p>
        <h2 className="font-playfair uppercase tracking-[0.18em] text-[#1C2E4A] text-3xl font-bold md:text-4xl lg:text-5xl mb-5">
          {active}
        </h2>
        <div className="inline-flex border border-[#e0e0e0]">
          {sizes.map(({ label }) => (
            <button
              key={label}
              onClick={() => setActive(label)}
              className={`px-8 py-2.5 text-sm font-montserrat font-bold uppercase tracking-[0.15em] transition-all ${
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
          sizeHint={active.replace(/[^0-9]/g, '')}
        />
      )}
    </section>
  )
}

export function HomeMobile({ products, collections, newArrivals, bestSelling, vouchers, activeDiscounts, isLoading }: HomeMobileProps) {
  const { t } = useLanguage()

  const maleProducts = products.filter(p => (p as any).gender?.toLowerCase() === 'male' || (p as any).gender?.toLowerCase() === 'men')
  const femaleProducts = products.filter(p => (p as any).gender?.toLowerCase() === 'female' || (p as any).gender?.toLowerCase() === 'women')
  const unisexProducts = products.filter(p => (p as any).gender?.toLowerCase() === 'unisex')
  const products15ml = products.filter(p => {
    const vol = ((p as any).volume || '').toLowerCase()
    const name = (p.name || '').toLowerCase()
    return vol.includes('15') || name.includes('15ml')
  })
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
        <CarouselSkeletonMobile bg="bg-[#F2F2F2]" titleBg="bg-[#1C2E4A]/20" />
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
        <CarouselSkeletonMobile bg="bg-white" titleBg="bg-[#1C2E4A]/20" />
      ) : (
        <GenderCarouselSection
          genders={[
            { label: (t.home as any).forMen || "Men's Collection", tabLabel: (t.home as any).forMenTab || 'For Men', products: maleProducts, href: '/products?gender=male' },
            { label: (t.home as any).forWomen || "Women's Collection", tabLabel: (t.home as any).forWomenTab || 'For Women', products: femaleProducts, href: '/products?gender=female' },
            { label: (t.home as any).forUnisex || 'Unisex Collection', tabLabel: (t.home as any).forUnisexTab || 'Unisex', products: unisexProducts, href: '/products?gender=unisex' },
          ]}
          vouchers={vouchers}
          activeDiscounts={activeDiscounts}
        />
      )}

      {isLoading ? (
        <CarouselSkeletonMobile bg="bg-white" titleBg="bg-[#1C2E4A]/20" />
      ) : (products15ml.length > 0 || products50ml.length > 0 || products100ml.length > 0) ? (
        <SizeCarouselSection
          products15ml={products15ml}
          products50ml={products50ml}
          products100ml={products100ml}
          vouchers={vouchers}
          activeDiscounts={activeDiscounts}
        />
      ) : null}
    </div>
  )
}
