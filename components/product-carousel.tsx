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
  variant?: 'new' | 'popular' | 'bestselling'
}

export function ProductCarousel({ 
  title, 
  products,
  backgroundColor = 'bg-gradient-to-b from-[#C2A36B] to-[#B8945E]',
  titleColor = 'text-[#1C2E4A]',
  variant = 'new'
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
        return 'bg-gradient-to-br from-white to-[#F5EFE6] border-2 border-[#C2A36B]/50 hover:border-[#C2A36B] hover:shadow-2xl hover:shadow-[#C2A36B]/30'
      default:
        return 'bg-white'
    }
  }

  return (
    <section className={`relative ${backgroundColor} py-6 md:py-8 lg:py-10`}>
      <div className="mx-auto max-w-7xl px-3 md:px-6 lg:px-8">
        {/* Title with scroll reveal */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-30%" }}
          transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-6 text-center md:mb-8"
        >
          <h2
            className={`
              font-serif
              text-xl
              font-bold
              ${titleColor}
              md:text-2xl
              lg:text-3xl
            `}
          >
            {title}
          </h2>
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            whileInView={{ opacity: 1, scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
            className={`mx-auto mt-3 h-px w-12 ${dividerColor} md:mt-4 md:w-14`}
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

          {/* Track with drag momentum */}
          <motion.div
            ref={scrollRef}
            className="
              flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 pb-3
              scrollbar-hide sm:gap-4 md:gap-4 lg:gap-6
              focus:outline-none
            "
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={() => checkScrollability()}
            style={{
              WebkitOverflowScrolling: 'touch',
              cursor: 'grab',
            }}
          >
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={false}
                animate={hasAnimated ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                transition={{
                  duration: 0.55,
                  delay: 0.2 + index * 0.08,
                  ease: [0.25, 0.1, 0.25, 1]
                }}
                className="
                  snap-center
                  flex-shrink-0
                  w-[42vw] max-w-[160px]
                  sm:w-[38vw] sm:max-w-[200px]
                  md:w-[260px]
                  lg:w-[300px]
                  xl:w-[320px]
                "
              >
                <ProductCard product={product} className={getCardClasses()} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}