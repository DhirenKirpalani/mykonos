'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccessibility } from '@/contexts/AccessibilityContext'

const slides = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=1920&q=80',
    title: 'SIGNATURE COLLECTION',
    subtitle: 'Discover Timeless Elegance',
    description: 'Exquisite fragrances crafted for the discerning connoisseur',
    cta: 'Explore Collection',
    link: '/collections/signature',
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=1920&q=80',
    title: 'NEW ARRIVALS',
    subtitle: 'The Art of Perfumery',
    description: 'Experience our latest masterpieces in haute perfumery',
    cta: 'Shop Now',
    link: '/products?new=true',
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=1920&q=80',
    title: 'GIFT SETS',
    subtitle: 'Luxury Gift Collection',
    description: 'Curated sets for those who appreciate the finer things',
    cta: 'View Gifts',
    link: '/products?category=Gift Sets',
  },
]

export function HeroCarousel() {
  const [[currentSlide, direction], setCurrentSlide] = useState([0, 0])
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const { isAccessibilityMode } = useAccessibility()

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    if (prefersReducedMotion || isAccessibilityMode) return

    const timer = setInterval(() => {
      setCurrentSlide(([prev]) => [(prev + 1) % slides.length, 1])
    }, 6000)
    return () => clearInterval(timer)
  }, [prefersReducedMotion, isAccessibilityMode])

  const nextSlide = useCallback(() => setCurrentSlide(([prev]) => [(prev + 1) % slides.length, 1]), [])
  const prevSlide = useCallback(() => setCurrentSlide(([prev]) => [(prev - 1 + slides.length) % slides.length, -1]), [])
  const goToSlide = useCallback((index: number) =>
    setCurrentSlide(([prev]) => [index, index > prev ? 1 : -1]), [])

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  }

  return (
    <div 
      className="relative h-[60vh] md:h-[70vh] lg:h-[85vh] overflow-hidden bg-black"
      role="region"
      aria-label="Hero carousel"
      aria-roledescription="carousel"
    >
      {/* Slides */}
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={currentSlide}
          custom={direction}
          variants={variants}
          initial={prefersReducedMotion || isAccessibilityMode ? "center" : "enter"}
          animate="center"
          exit={prefersReducedMotion || isAccessibilityMode ? "center" : "exit"}
          transition={prefersReducedMotion || isAccessibilityMode ? { duration: 0 } : {
            x: { type: 'spring', stiffness: 300, damping: 30 },
            opacity: { duration: 0.5 },
          }}
          className="absolute inset-0"
          role="group"
          aria-roledescription="slide"
          aria-label={`Slide ${currentSlide + 1} of ${slides.length}: ${slides[currentSlide].title}`}
        >
          {/* Background */}
          <div className="absolute inset-0">
            <Image
              src={slides[currentSlide].image}
              alt={slides[currentSlide].title}
              fill
              className="object-cover opacity-70"
              priority
              quality={90}
              sizes="100vw"
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k="
            />
            <div className="absolute inset-0 bg-black/40" />
          </div>

          {/* Content */}
          <div className="relative z-10 flex h-full items-center justify-center">
            <div className="container mx-auto px-4 lg:px-8 text-center max-w-3xl">
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-4 text-xs font-medium uppercase tracking-[0.3em] text-yellow-400 md:text-sm"
              >
                {slides[currentSlide].subtitle}
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-6 font-serif text-4xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl"
              >
                {slides[currentSlide].title}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-8 text-base text-gray-200 md:text-lg"
              >
                {slides[currentSlide].description}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Link
                  href={slides[currentSlide].link}
                  className="inline-block border-2 border-yellow-400 bg-yellow-400 px-8 py-4 text-sm font-medium uppercase tracking-wider text-black transition-all hover:bg-black hover:text-white hover:border-white"
                >
                  {slides[currentSlide].cta}
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Dots */}
      <div 
        className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 gap-3"
        role="group"
        aria-label="Carousel navigation"
      >
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goToSlide(i)}
            className={`h-2 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 ${
              i === currentSlide ? 'w-12 bg-yellow-400' : 'w-2 bg-white/40 hover:bg-white/60'
            }`}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === currentSlide ? 'true' : 'false'}
          />
        ))}
      </div>
    </div>
  )
}
