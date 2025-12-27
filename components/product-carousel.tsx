'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ProductCard } from '@/components/product-card'
import { Database } from '@/lib/supabase/database.types'

type Product = Database['public']['Tables']['products']['Row']

interface ProductCarouselProps {
  title: string
  products: Product[]
  backgroundColor?: string
  titleColor?: string
}

export function ProductCarousel({ 
  title, 
  products,
  backgroundColor = 'bg-gradient-to-b from-[#C2A36B] to-[#B8945E]',
  titleColor = 'text-[#1C2E4A]'
}: ProductCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

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

  // Determine divider color based on title color
  const dividerColor = titleColor === 'text-[#1C2E4A]' 
    ? 'bg-[#1C2E4A]/70' 
    : 'bg-[#C2A36B]/50'

  return (
    <section className={`relative ${backgroundColor} py-8 md:py-12 lg:py-16 xl:py-20`}>
      <div className="mx-auto max-w-7xl px-3 md:px-6 lg:px-8">
        {/* Title with scroll reveal */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-30%" }}
          transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-8 text-center md:mb-12 lg:mb-16"
        >
          <h2
            className={`
              font-serif
              text-2xl
              font-bold
              ${titleColor}
              md:text-3xl
              lg:text-5xl
            `}
          >
            {title}
          </h2>
          {/* Divider with staggered reveal */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            whileInView={{ opacity: 1, scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
            className={`mx-auto mt-4 h-px w-12 ${dividerColor} md:mt-6 md:w-16`}
          />
        </motion.div>

        <div className="relative">
          {/* Left Arrow */}
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              aria-label="Previous products"
              type="button"
              className="
                absolute left-1 top-1/2 z-20
                flex -translate-y-1/2
                items-center justify-center
                rounded-full
                bg-white
                p-2
                text-[#1C2E4A]
                shadow-[0_2px_8px_rgba(0,0,0,0.12)]
                transition-all duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]
                active:scale-[0.92]
                hover:bg-[#1C2E4A]
                hover:text-white
                focus:outline-none
                focus:ring-2
                focus:ring-[#C2A36B]
                focus:ring-offset-2
                md:-left-4
                md:p-2.5
                lg:-left-6
                lg:p-3
                cursor-pointer
              "
            >
              <ChevronLeft size={16} className="md:h-5 md:w-5 lg:h-6 lg:w-6" aria-hidden="true" />
            </button>
          )}

          {/* Right Arrow */}
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              aria-label="Next products"
              type="button"
              className="
                absolute right-1 top-1/2 z-20
                flex -translate-y-1/2
                items-center justify-center
                rounded-full
                bg-white
                p-2
                text-[#1C2E4A]
                shadow-[0_2px_8px_rgba(0,0,0,0.12)]
                transition-all duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]
                active:scale-[0.92]
                hover:bg-[#1C2E4A]
                hover:text-white
                focus:outline-none
                focus:ring-2
                focus:ring-[#C2A36B]
                focus:ring-offset-2
                md:-right-4
                md:p-2.5
                lg:-right-6
                lg:p-3
                cursor-pointer
              "
            >
              <ChevronRight size={16} className="md:h-5 md:w-5 lg:h-6 lg:w-6" aria-hidden="true" />
            </button>
          )}

          {/* Track */}
          <div
            ref={scrollRef}
            className="
              flex gap-3
              overflow-x-auto
              snap-x snap-mandatory
              px-4
              pb-3
              scrollbar-hide
              sm:gap-4
              md:mx-0 md:gap-4 md:px-0 md:pb-4
              lg:gap-6
              lg:pb-6
              focus:outline-none
              focus:ring-2
              focus:ring-luxury-gold
              focus:ring-offset-2
            "
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-20%" }}
                transition={{
                  duration: 0.55,
                  delay: 0.2 + index * 0.08,
                  ease: [0.25, 0.1, 0.25, 1]
                }}
                className="
                  snap-start
                  flex-shrink-0
                  w-[42vw]
                  max-w-[160px]
                  sm:w-[38vw]
                  sm:max-w-[180px]
                  md:w-[220px]
                  md:max-w-none
                  lg:w-[240px]
                  xl:w-[260px]
                "
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}


