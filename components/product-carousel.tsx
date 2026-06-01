'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ProductCard } from '@/components/product-card'
import { Database } from '@/lib/supabase/database.types'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

type Product = Database['public']['Tables']['products']['Row']

interface ProductCarouselProps {
  title: string
  products: Product[]
  backgroundColor?: string
  titleColor?: string
  variant?: 'new' | 'popular' | 'bestselling'
  vouchers?: any[]
  activeDiscounts?: Map<string, any>
  viewAllHref?: string
  hideSubtitle?: boolean
  compactTitle?: boolean
  hideViewAll?: boolean
  noBorders?: boolean
  hideHeader?: boolean
}

export function ProductCarousel({ 
  title, 
  products,
  backgroundColor = 'bg-gradient-to-b from-[#C2A36B] to-[#B8945E]',
  titleColor = 'text-[#1C2E4A]',
  variant = 'new',
  vouchers = [],
  activeDiscounts,
  viewAllHref = '/products',
  hideSubtitle = false,
  compactTitle = false,
  hideViewAll = false,
  noBorders = false,
  hideHeader = false
}: ProductCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [hasAnimated, setHasAnimated] = useState(false)

  useEffect(() => setHasAnimated(true), [])

  const checkScrollability = useCallback(() => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setCanScrollLeft(scrollLeft > 5)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5)
  }, [])

  useEffect(() => {
    checkScrollability()
    const scrollContainer = scrollRef.current
    if (!scrollContainer) return

    const handleScroll = () => checkScrollability()
    const handleResize = () => checkScrollability()

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize, { passive: true })

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
    }
  }, [checkScrollability])

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({
      left: dir === 'left' ? -360 : 360,
      behavior: 'smooth',
    })
    setTimeout(() => checkScrollability(), 300)
  }

  const dividerColor = variant === 'popular' 
    ? 'bg-[#C2A36B]/70' 
    : 'bg-[#1C2E4A]/70'

  const getCardClasses = () => {
    switch(variant) {
      case 'new':
        return 'bg-white border-2 border-[#E8DCC4] hover:border-[#C2A36B] hover:shadow-2xl'
      case 'popular':
        return 'bg-[#1C2E4A]/80 backdrop-blur-sm border-2 border-[#C2A36B]/30 hover:border-[#C2A36B] hover:shadow-2xl hover:shadow-[#C2A36B]/20'
      case 'bestselling':
        return 'bestselling bg-white'
      default:
        return 'bg-white'
    }
  }

  // ─── BESTSELLING: full-width edge-to-edge layout ────────────────────────────
  if (variant === 'bestselling') {
    return (
      <section className={`relative ${backgroundColor} py-8 md:py-12 lg:py-16`}>
        {/* Padded heading */}
        {!hideHeader && (
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-30%' }}
            transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
            className="mb-8 md:mb-10 text-center"
          >
            {!hideSubtitle && (
              <p className="mb-3 text-sm font-montserrat font-normal uppercase tracking-[0.3em] text-[#333] md:text-base">
                MUST HAVE
              </p>
            )}
            <h2 className={`font-montserrat uppercase tracking-[0.18em] ${titleColor} ${
              compactTitle
                ? 'text-lg font-semibold md:text-xl'
                : 'text-3xl font-bold md:text-4xl lg:text-5xl'
            }`}>
              {title}
            </h2>
          </motion.div>
        </div>
        )}

        {/* Full-width carousel track */}
        <div className="relative w-full">
          {/* Left scroll arrow - visible on all devices */}
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              aria-label="Previous products"
              type="button"
              className="group/arrow absolute left-2 sm:left-3 top-1/2 z-20 -translate-y-1/2 flex items-center justify-center rounded-full bg-white/95 backdrop-blur-sm shadow-lg p-2 sm:p-3 border border-[#e0e0e0] transition-all hover:bg-gradient-to-br hover:from-[#1A56DB] hover:via-[#1E3A8A] hover:to-[#B8985F] hover:border-transparent active:scale-95 cursor-pointer"
            >
              <ChevronLeft size={18} className="sm:w-5 sm:h-5 text-[#1C2E4A] group-hover/arrow:text-white transition-colors" aria-hidden="true" />
            </button>
          )}

          {/* Right scroll arrow - visible on all devices */}
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              aria-label="Next products"
              type="button"
              className="group/arrow absolute right-2 sm:right-3 top-1/2 z-20 -translate-y-1/2 flex items-center justify-center rounded-full bg-white/95 backdrop-blur-sm shadow-lg p-2 sm:p-3 border border-[#e0e0e0] transition-all hover:bg-gradient-to-br hover:from-[#1A56DB] hover:via-[#1E3A8A] hover:to-[#B8985F] hover:border-transparent active:scale-95 cursor-pointer"
            >
              <ChevronRight size={18} className="sm:w-5 sm:h-5 text-[#1C2E4A] group-hover/arrow:text-white transition-colors" aria-hidden="true" />
            </button>
          )}

          {/* Card track — no gaps, edge to edge, touch-scrollable on mobile */}
          <div
            ref={scrollRef}
            className={`flex overflow-x-auto scrollbar-hide snap-x snap-proximity ${noBorders ? '' : 'border-t border-b border-[#e0e0e0]'}`}
            style={{ WebkitOverflowScrolling: 'touch', scrollBehavior: 'smooth' }}
          >
            {products.map((product, index) => {
              const applicableVoucher = vouchers.find(v =>
                v.scope === 'all' ||
                (v.scope === 'specific_products' && v.applicable_product_ids?.includes(product.id))
              )
              const voucherData = applicableVoucher ? {
                discount_type: applicableVoucher.discount_type,
                discount_value: applicableVoucher.discount_value,
                valid_until: applicableVoucher.valid_until,
              } : null

              const cardWidthClass = noBorders
                ? 'snap-start flex-shrink-0 w-[calc(100vw/2.2)] sm:w-[calc(100vw/3)] md:w-[calc(100vw/3.8)] lg:w-[calc(100vw/4.8)] xl:w-[calc(100vw/5.2)]'
                : 'snap-start flex-shrink-0 w-[calc(100vw/1.8)] sm:w-[calc(100vw/2.8)] md:w-[calc(100vw/3.8)] lg:w-[calc(100vw/4.8)] xl:w-[calc(100vw/5.2)] border-r border-[#e0e0e0]'

              return (
                <div
                  key={product.id}
                  className={cardWidthClass}
                >
                  <ProductCard
                    product={product}
                    voucher={voucherData}
                    activeDiscount={activeDiscounts?.get(product.id) || null}
                    className="bestselling bg-white"
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Padded View All button */}
        {!hideViewAll && (
          <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="mt-10 md:mt-12 text-center"
            >
              <Link href={viewAllHref}>
                <Button className="bg-[#1C2E4A] text-white px-10 py-3 text-xs font-montserrat font-semibold uppercase tracking-[0.2em] hover:bg-[#1C2E4A]/90 transition-all rounded-none">
                  VIEW ALL PRODUCTS
                </Button>
              </Link>
            </motion.div>
          </div>
        )}
      </section>
    )
  }

  // ─── OTHER VARIANTS (new / popular) ──────────────────────────────────────────
  return (
    <section className={`relative ${backgroundColor} py-8 md:py-10 lg:py-12`}>
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-30%' }}
          transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-6 md:mb-8 text-center"
        >
          <h2 className={`font-serif text-2xl font-bold ${titleColor} md:text-3xl lg:text-4xl tracking-tight`}>
            {title}
          </h2>
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            whileInView={{ opacity: 1, scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
            className={`mx-auto mt-3 h-0.5 w-16 ${dividerColor} md:mt-4 md:w-20 rounded-full`}
          />
        </motion.div>

        <div className="relative">
          {/* Left Arrow - visible on all devices */}
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              aria-label="Previous products"
              type="button"
              className="group/arrow absolute left-1 top-1/2 z-20 flex -translate-y-1/2 items-center justify-center rounded-full bg-white/95 backdrop-blur-sm p-2 text-luxury-navy shadow-lg transition-all hover:bg-gradient-to-br hover:from-[#1A56DB] hover:via-[#1E3A8A] hover:to-[#B8985F] md:-left-4 lg:-left-6 md:p-2.5 lg:p-3 cursor-pointer active:scale-95"
            >
              <ChevronLeft size={18} className="md:w-5 md:h-5 lg:h-6 lg:w-6 group-hover/arrow:text-white transition-colors" aria-hidden="true" />
            </button>
          )}
          {/* Right Arrow - visible on all devices */}
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              aria-label="Next products"
              type="button"
              className="group/arrow absolute right-1 top-1/2 z-20 flex -translate-y-1/2 items-center justify-center rounded-full bg-white/95 backdrop-blur-sm p-2 text-luxury-navy shadow-lg transition-all hover:bg-gradient-to-br hover:from-[#1A56DB] hover:via-[#1E3A8A] hover:to-[#B8985F] md:-right-4 lg:-right-6 md:p-2.5 lg:p-3 cursor-pointer active:scale-95"
            >
              <ChevronRight size={18} className="md:w-5 md:h-5 lg:h-6 lg:w-6 group-hover/arrow:text-white transition-colors" aria-hidden="true" />
            </button>
          )}

          {/* Track */}
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory px-4 pb-4 scrollbar-hide sm:gap-5 md:gap-5 lg:gap-6 focus:outline-none -mx-4 md:mx-0"
            style={{ WebkitOverflowScrolling: 'touch', scrollPaddingLeft: '1rem', scrollPaddingRight: '1rem' }}
          >
            {products.map((product, index) => {
              const applicableVoucher = vouchers.find(v =>
                v.scope === 'all' ||
                (v.scope === 'specific_products' && v.applicable_product_ids?.includes(product.id))
              )
              const voucherData = applicableVoucher ? {
                discount_type: applicableVoucher.discount_type,
                discount_value: applicableVoucher.discount_value,
                valid_until: applicableVoucher.valid_until,
              } : null

              return (
                <motion.div
                  key={product.id}
                  initial={false}
                  animate={hasAnimated ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                  transition={{ duration: 0.55, delay: 0.2 + index * 0.08, ease: [0.25, 0.1, 0.25, 1] }}
                  className="snap-center flex-shrink-0 w-[45vw] max-w-[180px] sm:w-[40vw] sm:max-w-[220px] md:w-[280px] lg:w-[320px] xl:w-[340px] first:ml-0 last:mr-0"
                >
                  <ProductCard product={product} voucher={voucherData} activeDiscount={activeDiscounts?.get(product.id) || null} className={getCardClasses()} />
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}