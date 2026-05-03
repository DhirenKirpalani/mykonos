'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useTranslation } from '@/hooks/useTranslation'

interface HeroMedia {
  id: string
  media_type: 'video' | 'image'
  media_url: string
  mobile_media_url: string | null
  link_url: string | null
  title: string | null
  subtitle: string | null
  show_button: boolean
  button_text: string
  overlay_opacity: number
  sort_order: number
}

export function HeroCarousel() {
  const { t } = useTranslation()
  const [heroItems, setHeroItems] = useState<HeroMedia[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [imagesLoaded, setImagesLoaded] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchHeroMedia()
  }, [])

  const fetchHeroMedia = async () => {
    try {
      console.log('[Hero Carousel] Fetching hero media at', new Date().toISOString())
      
      // Use fetch directly with cache: 'no-store' to bypass browser HTTP cache
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      const res = await fetch(
        `${supabaseUrl}/rest/v1/hero_media?is_active=eq.true&order=sort_order.asc,created_at.desc&select=*`,
        {
          cache: 'no-store',
          headers: {
            apikey: supabaseKey || '',
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
        }
      )
      const data = res.ok ? await res.json() : null
      const error = res.ok ? null : { message: `HTTP ${res.status}` }

      if (error) {
        console.error('[Hero Carousel] Error fetching hero media:', error)
        return
      }

      console.log('[Hero Carousel] Query result:', { 
        count: data?.length || 0, 
        items: data?.map((item: HeroMedia) => ({ 
          id: item.id.substring(0, 8), 
          type: item.media_type, 
          order: item.sort_order
        }))
      })

      if (data && data.length > 0) {
        console.log('[Hero Carousel] ✅ Loaded', data.length, 'active hero items')
        setHeroItems(data)
      } else {
        console.log('[Hero Carousel] ⚠️ No active hero media found - using default video')
        setHeroItems([]) // Clear any stale data
      }
    } catch (error) {
      console.error('[Hero Carousel] ❌ Exception:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-rotate carousel every 5 seconds if multiple items
  useEffect(() => {
    if (heroItems.length <= 1) return

    const interval = setInterval(() => {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % heroItems.length)
        setTimeout(() => setIsTransitioning(false), 100)
      }, 700)
    }, 5000)

    return () => clearInterval(interval)
  }, [heroItems.length])

  const defaultVideoUrl = "/assets/Blue and White Simple Elegant Minimalist Parfume Launching Soon Video.mp4"
  const currentItem = heroItems[currentIndex]
  const desktopMediaUrl = currentItem?.media_url || defaultVideoUrl
  const mobileMediaUrl = currentItem?.mobile_media_url || desktopMediaUrl
  const isVideo = currentItem?.media_type === 'video' || !currentItem
  const shopNowLink = currentItem?.link_url || '/products'
  const overlayOpacity = currentItem?.overlay_opacity ?? 30
  // Use translation if button_text is empty or is the default "Shop Now"/"SHOP NOW"
  const buttonText = (!currentItem?.button_text || currentItem.button_text.toUpperCase() === 'SHOP NOW') 
    ? t('home.shopNow') 
    : currentItem.button_text

  return (
    <div
      className="relative h-[calc(100svh-6.5rem)] md:h-[70vh] lg:h-[85vh] overflow-hidden bg-luxury-navy"
      role="region"
      aria-label="Hero banner"
    >
      {/* Loading Skeleton - solid cover, NO animate-pulse (pulse reduces opacity and reveals video underneath) */}
      {isLoading && (
        <div className="absolute inset-0 z-10 bg-luxury-navy" />
      )}

      {/* Media Background with crossfade transition */}
      {heroItems.map((item, index) => {
        const itemDesktopUrl = item.media_url
        const itemMobileUrl = item.mobile_media_url || itemDesktopUrl
        const itemIsVideo = item.media_type === 'video'
        const itemOverlayOpacity = item.overlay_opacity ?? 30
        const isActive = index === currentIndex
        
        const mediaContent = (
          <div className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${isActive ? 'opacity-100' : 'opacity-0'}`}>
            {itemIsVideo ? (
              <>
                <video
                  key={`${item.id}-desktop-video`}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  className="hidden md:block h-full w-full object-cover object-center"
                >
                  <source src={itemDesktopUrl} type="video/mp4" />
                </video>
                <video
                  key={`${item.id}-mobile-video`}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  className="block md:hidden h-full w-full object-cover object-top"
                >
                  <source src={itemMobileUrl} type="video/mp4" />
                </video>
              </>
            ) : (
              <>
                <div className="hidden md:block relative h-full w-full">
                  <Image
                    key={`${item.id}-desktop-image`}
                    src={itemDesktopUrl}
                    alt={item.title || "Hero"}
                    fill
                    priority={index === 0}
                    quality={90}
                    sizes="100vw"
                    className="object-cover object-center"
                    onLoad={() => {
                      setImagesLoaded(prev => new Set(prev).add(`${item.id}-desktop`))
                    }}
                  />
                </div>
                <div className="block md:hidden relative h-full w-full">
                  <Image
                    key={`${item.id}-mobile-image`}
                    src={itemMobileUrl}
                    alt={item.title || "Hero"}
                    fill
                    priority={index === 0}
                    quality={90}
                    sizes="100vw"
                    className="object-cover object-center"
                    onLoad={() => {
                      setImagesLoaded(prev => new Set(prev).add(`${item.id}-mobile`))
                    }}
                  />
                </div>
              </>
            )}
            <div className="absolute inset-0 bg-black" style={{ opacity: itemOverlayOpacity / 100 }} />
          </div>
        )

        return item.link_url ? (
          <Link key={item.id} href={item.link_url} className="absolute inset-0 block" style={{ pointerEvents: isActive ? 'auto' : 'none' }}>
            {mediaContent}
          </Link>
        ) : (
          <div key={item.id}>
            {mediaContent}
          </div>
        )
      })}
      
      {/* Fallback for when no hero items exist */}
      {heroItems.length === 0 && !isLoading && (
        <div className="absolute inset-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="hidden md:block h-full w-full object-cover object-center"
          >
            <source src={defaultVideoUrl} type="video/mp4" />
          </video>
          <video
            autoPlay
            loop
            muted
            playsInline
            className="block md:hidden h-full w-full object-cover object-top"
          >
            <source src={defaultVideoUrl} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black" style={{ opacity: 0.3 }} />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex h-full items-end justify-center pb-16 md:pb-20 lg:pb-24" style={{ paddingBottom: 'max(4rem, calc(env(safe-area-inset-bottom) + 2rem))' }}>
        <div className="container mx-auto px-4 lg:px-8 text-center max-w-3xl">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            {currentItem?.title && (
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white drop-shadow-lg">
                {currentItem.title}
              </h1>
            )}
            {currentItem?.subtitle && (
              <p className="text-base sm:text-lg md:text-xl text-white/90 drop-shadow-md">
                {currentItem.subtitle}
              </p>
            )}
            {(currentItem?.show_button !== false) && (
              <Link
                href={shopNowLink}
                className="inline-block border-2 border-white bg-white/10 backdrop-blur-sm px-8 py-3 sm:px-12 sm:py-4 text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-sm transition-all hover:bg-white/25"
              >
                {buttonText}
              </Link>
            )}
          </motion.div>
        </div>
      </div>

      {/* Carousel Indicators */}
      {heroItems.length > 1 && (
        <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          {heroItems.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setIsTransitioning(true)
                setCurrentIndex(index)
                setTimeout(() => setIsTransitioning(false), 500)
              }}
              className={`rounded-full transition-all ${
                index === currentIndex
                  ? 'h-2.5 w-2.5 bg-white'
                  : 'h-2.5 w-2.5 border border-white/70 bg-transparent hover:border-white'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
