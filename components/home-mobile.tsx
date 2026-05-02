'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { HeroCarousel } from '@/components/hero-carousel'
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
        <p className="text-sm font-normal uppercase tracking-[0.3em] text-[#333] mb-4">SHOP BY SIZE</p>
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

export function HomeMobile({ products, collections, newArrivals, bestSelling, vouchers, activeDiscounts, isLoading }: HomeMobileProps) {
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
      ) : maleProducts.length > 0 ? (
        <ProductCarousel
          title={(t.home as any).forMen || 'For Men'}
          products={maleProducts}
          backgroundColor="bg-white"
          titleColor="text-[#1C2E4A]"
          variant="bestselling"
          viewAllHref="/products?gender=male"
          vouchers={vouchers}
          activeDiscounts={activeDiscounts}
        />
      ) : null}

      {isLoading ? (
        <CarouselSkeletonMobile bg="bg-white" titleBg="bg-[#1C2E4A]/20" />
      ) : femaleProducts.length > 0 ? (
        <ProductCarousel
          title={(t.home as any).forWomen || 'For Women'}
          products={femaleProducts}
          backgroundColor="bg-white"
          titleColor="text-[#1C2E4A]"
          variant="bestselling"
          viewAllHref="/products?gender=female"
          vouchers={vouchers}
          activeDiscounts={activeDiscounts}
        />
      ) : null}

      {isLoading ? (
        <CarouselSkeletonMobile bg="bg-white" titleBg="bg-[#1C2E4A]/20" />
      ) : unisexProducts.length > 0 ? (
        <ProductCarousel
          title={(t.home as any).forUnisex || 'Unisex'}
          products={unisexProducts}
          backgroundColor="bg-white"
          titleColor="text-[#1C2E4A]"
          variant="bestselling"
          viewAllHref="/products?gender=unisex"
          vouchers={vouchers}
          activeDiscounts={activeDiscounts}
        />
      ) : null}

      {isLoading ? (
        <CarouselSkeletonMobile bg="bg-white" titleBg="bg-[#1C2E4A]/20" />
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
