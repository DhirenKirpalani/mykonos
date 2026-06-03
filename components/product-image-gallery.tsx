'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ProductImageGalleryProps {
  images: string[]
  productName: string
  voucher?: {
    discount_type: 'percentage' | 'fixed'
    discount_value: number
    valid_until: string
  } | null
  onVoucherExpire?: () => void
  isOutOfStock?: boolean
  locale?: string
}

export function ProductImageGallery({ images, productName, voucher, onVoucherExpire, isOutOfStock = false, locale = 'id' }: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [direction, setDirection] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const mobileContainerRef = useRef<HTMLDivElement>(null)
  const lbContainerRef = useRef<HTMLDivElement>(null)
  const selectedIndexRef = useRef(selectedIndex)
  const imagesLengthRef = useRef(images.length)
  const imageRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => { selectedIndexRef.current = selectedIndex }, [selectedIndex])
  useEffect(() => { imagesLengthRef.current = images.length }, [images.length])

  const handleSelect = (index: number) => {
    setDirection(index > selectedIndexRef.current ? 1 : -1)
    setSelectedIndex(index)
    
    // Scroll to the selected image in desktop view
    if (imageRefs.current[index]) {
      imageRefs.current[index]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      })
    }
  }

  const attachSwipe = (el: HTMLElement | null) => {
    if (!el) return () => {}
    let sx = 0; let sy = 0
    const onStart = (e: TouchEvent) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY }
    const onEnd = (e: TouchEvent) => {
      const dx = sx - e.changedTouches[0].clientX
      const dy = sy - e.changedTouches[0].clientY
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
        const idx = selectedIndexRef.current
        const len = imagesLengthRef.current
        if (dx > 0 && idx < len - 1) handleSelect(idx + 1)
        else if (dx < 0 && idx > 0) handleSelect(idx - 1)
      }
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchend', onEnd, { passive: true })
    return () => { el.removeEventListener('touchstart', onStart); el.removeEventListener('touchend', onEnd) }
  }

  useEffect(() => attachSwipe(mobileContainerRef.current), [mobileContainerRef.current])
  useEffect(() => { if (lightboxOpen) return attachSwipe(lbContainerRef.current) }, [lightboxOpen, lbContainerRef.current])

  const isVideo = (url: string | undefined) => {
    if (!url) return false
    return url.endsWith('.mp4') || url.endsWith('.mov') || url.includes('video')
  }

  const selectedMedia = images[selectedIndex]
  
  // Return null if no images or invalid index
  if (!images || images.length === 0 || !selectedMedia) {
    return null
  }

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? '-100%' : '100%', opacity: 0 }),
  }

  const mainImageJSX = (aspectClass?: string) => (
    <div
      className={`relative w-full overflow-hidden bg-white rounded-xl ${aspectClass ?? 'aspect-square'}`}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Zoom button */}
      {!isVideo(selectedMedia) && (
        <button
          onClick={() => setLightboxOpen(true)}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm shadow-md flex items-center justify-center hover:bg-white transition-colors"
          aria-label="Zoom image"
        >
          <svg className="h-4 w-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.35-4.35M11 8v6M8 11h6" strokeLinecap="round" />
          </svg>
        </button>
      )}
      {isOutOfStock && (
        <div className="absolute inset-0 z-30 flex items-center justify-center">
          <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-black/70 flex items-center justify-center">
            <span className="text-white text-base md:text-lg font-bold">
              {locale === 'id' ? 'Habis' : 'Sold Out'}
            </span>
          </div>
        </div>
      )}
      <AnimatePresence initial={false} custom={direction} mode="sync">
        <motion.div
          key={selectedIndex}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="absolute inset-0"
        >
          {isVideo(selectedMedia) ? (
            <video src={selectedMedia} controls className="h-full w-full object-contain" autoPlay loop muted playsInline>
              Your browser does not support the video tag.
            </video>
          ) : (
            <Image
              src={selectedMedia}
              alt={`${productName} - Image ${selectedIndex + 1}`}
              fill
              className="object-contain"
              priority={selectedIndex === 0}
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )

  const thumbnailsJSX = (url: string, index: number) => (
    <button
      key={index}
      onClick={() => handleSelect(index)}
      className={cn(
        "relative aspect-square overflow-hidden rounded-md border-2 transition-all hover:border-luxury-navy flex-shrink-0",
        selectedIndex === index ? "border-luxury-navy" : "border-gray-200"
      )}
    >
      {isVideo(url) ? (
        <div className="relative h-full w-full bg-gray-100">
          <video src={url} className="h-full w-full object-cover" preload="metadata" muted playsInline />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <svg className="h-5 w-5 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          </div>
        </div>
      ) : (
        <Image src={url} alt={`${productName} thumbnail ${index + 1}`} fill className="object-cover" sizes="10vw" />
      )}
    </button>
  )

  return (
    <>
      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center"
          >
            {/* Image in white card */}
            <div className="flex-1 flex items-center justify-center w-full px-6 py-6">
              <div
                ref={lbContainerRef}
                className="relative w-full max-w-sm rounded-2xl overflow-hidden bg-white"
                style={{ aspectRatio: '4/5' }}
              >
                <AnimatePresence initial={false} custom={direction} mode="sync">
                  <motion.div
                    key={selectedIndex}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="absolute inset-0"
                  >
                    <Image
                      src={images[selectedIndex]}
                      alt={`${productName} - Image ${selectedIndex + 1}`}
                      fill
                      className="object-contain"
                      sizes="100vw"
                      priority
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Bottom controls */}
            <div className="flex items-center justify-center gap-5 pb-10 pt-6 flex-shrink-0">
              <button
                onClick={() => selectedIndex > 0 && handleSelect(selectedIndex - 1)}
                className={`w-11 h-11 rounded-full bg-white shadow-md flex items-center justify-center transition-all ${
                  selectedIndex === 0 ? 'opacity-30 cursor-default' : 'hover:shadow-lg active:scale-95'
                }`}
                disabled={selectedIndex === 0}
              >
                <svg className="h-4 w-4 text-gray-800" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                onClick={() => setLightboxOpen(false)}
                className="w-11 h-11 rounded-full bg-white shadow-md flex items-center justify-center hover:shadow-lg active:scale-95 transition-all"
              >
                <svg className="h-4 w-4 text-gray-800" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
              <button
                onClick={() => selectedIndex < images.length - 1 && handleSelect(selectedIndex + 1)}
                className={`w-11 h-11 rounded-full bg-white shadow-md flex items-center justify-center transition-all ${
                  selectedIndex === images.length - 1 ? 'opacity-30 cursor-default' : 'hover:shadow-lg active:scale-95'
                }`}
                disabled={selectedIndex === images.length - 1}
              >
                <svg className="h-4 w-4 text-gray-800" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Desktop: vertical thumbnails left + all images stacked vertically right */}
      <div className="hidden md:flex gap-3 w-full max-h-[600px]">
        {images.length > 1 && (
          <div className="flex flex-col gap-2 w-[68px] flex-shrink-0 overflow-y-auto max-h-[600px] pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400">
            {images.map((url, index) => thumbnailsJSX(url, index))}
          </div>
        )}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400">
          <div className="flex flex-col gap-3">
            {images.map((url, index) => (
              <div 
                key={index} 
                ref={(el) => { imageRefs.current[index] = el }}
                className="relative w-full bg-white rounded-xl overflow-hidden"
              >
                {/* Zoom button */}
                {!isVideo(url) && (
                  <button
                    onClick={() => {
                      setSelectedIndex(index)
                      setLightboxOpen(true)
                    }}
                    className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm shadow-md flex items-center justify-center hover:bg-white transition-colors"
                    aria-label="Zoom image"
                  >
                    <svg className="h-4 w-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="7" />
                      <path d="m21 21-4.35-4.35M11 8v6M8 11h6" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
                {isOutOfStock && index === 0 && (
                  <div className="absolute inset-0 z-30 flex items-center justify-center">
                    <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-black/70 flex items-center justify-center">
                      <span className="text-white text-base md:text-lg font-bold">
                        {locale === 'id' ? 'Habis' : 'Sold Out'}
                      </span>
                    </div>
                  </div>
                )}
                {isVideo(url) ? (
                  <video src={url} controls className="w-full object-contain" autoPlay loop muted playsInline>
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <div className="relative w-full aspect-square">
                    <Image
                      src={url}
                      alt={`${productName} - Image ${index + 1}`}
                      fill
                      className="object-contain"
                      priority={index === 0}
                      sizes="50vw"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile: full-width image + dot navigation (Afnan-style) */}
      <div ref={mobileContainerRef} className="md:hidden flex flex-col">
        {mainImageJSX('aspect-[4/5]')}
        {images.length > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => handleSelect(index)}
                className={`rounded-full transition-all duration-300 ${
                  selectedIndex === index
                    ? 'w-4 h-1.5 bg-luxury-navy'
                    : 'w-1.5 h-1.5 bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Image ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
