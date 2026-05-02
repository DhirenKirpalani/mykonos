'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const carouselImages = [
  '/assets/carousel1/id-11134210-8224z-mgon1iyctwy454.webp',
  '/assets/carousel1/id-11134210-8224z-mgon1iycwq3065.webp',
  '/assets/carousel1/id-11134210-82251-mgon1iycsidobe.webp',
  '/assets/carousel1/id-11134210-82251-mgon1iydarrgfd.webp',
  '/assets/carousel1/id-11134210-82252-mglvauowbevc06.webp',
  '/assets/carousel1/id-11134210-8224y-mgon1iydm0b04e.webp',
]

export function ImageCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(0)

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0
    })
  }

  const swipeConfidenceThreshold = 10000
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity
  }

  const paginate = (newDirection: number) => {
    setDirection(newDirection)
    setCurrentIndex((prevIndex) => {
      if (newDirection === 1) {
        return prevIndex === carouselImages.length - 1 ? 0 : prevIndex + 1
      } else {
        return prevIndex === 0 ? carouselImages.length - 1 : prevIndex - 1
      }
    })
  }

  useEffect(() => {
    const timer = setInterval(() => {
      paginate(1)
    }, 5000)

    return () => clearInterval(timer)
  }, [currentIndex])

  return (
    <section className="relative bg-gradient-to-b from-[#E8DCC4] to-[#D4C5A9] py-8 md:py-12 lg:py-16">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="relative w-full overflow-hidden rounded-lg shadow-2xl">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "tween", duration: 0.5, ease: "easeInOut" },
                opacity: { duration: 0.5 }
              }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={1}
              onDragEnd={(e, { offset, velocity }) => {
                const swipe = swipePower(offset.x, velocity.x)

                if (swipe < -swipeConfidenceThreshold) {
                  paginate(1)
                } else if (swipe > swipeConfidenceThreshold) {
                  paginate(-1)
                }
              }}
              className="relative w-full will-change-transform"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <Image
                src={carouselImages[currentIndex]}
                alt={`Carousel image ${currentIndex + 1}`}
                width={1200}
                height={600}
                className="w-full h-auto object-contain"
                priority={currentIndex === 0}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1200px"
              />
            </motion.div>
          </AnimatePresence>

          <button
            onClick={() => paginate(-1)}
            className="group/arrow absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-lg transition-all hover:bg-gradient-to-br hover:from-[#1A56DB] hover:via-[#1E3A8A] hover:to-[#B8985F] hover:scale-105"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-5 w-5 md:h-6 md:w-6 text-[#1C2E4A] group-hover/arrow:text-white transition-colors" />
          </button>

          <button
            onClick={() => paginate(1)}
            className="group/arrow absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-lg transition-all hover:bg-gradient-to-br hover:from-[#1A56DB] hover:via-[#1E3A8A] hover:to-[#B8985F] hover:scale-105"
            aria-label="Next image"
          >
            <ChevronRight className="h-5 w-5 md:h-6 md:w-6 text-[#1C2E4A] group-hover/arrow:text-white transition-colors" />
          </button>

          <div className="absolute bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
            {carouselImages.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setDirection(index > currentIndex ? 1 : -1)
                  setCurrentIndex(index)
                }}
                className={`h-2 md:h-2.5 rounded-full transition-all ${
                  index === currentIndex
                    ? 'w-8 md:w-10 bg-[#C2A36B]'
                    : 'w-2 md:w-2.5 bg-white/60 hover:bg-white/80'
                }`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
