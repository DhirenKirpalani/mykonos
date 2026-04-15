'use client'

import Link from 'next/link'
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

  useEffect(() => {
    fetchHeroMedia()
  }, [])

  const fetchHeroMedia = async () => {
    try {
      console.log('[Hero Carousel] Fetching hero media at', new Date().toISOString())
      
      // Force fresh data by adding timestamp to bypass cache
      const { data, error } = await supabase
        .from('hero_media')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[Hero Carousel] Error fetching hero media:', error)
        return
      }

      console.log('[Hero Carousel] Query result:', { 
        count: data?.length || 0, 
        items: data?.map(item => ({ 
          id: item.id.substring(0, 8), 
          type: item.media_type, 
          order: item.sort_order,
          active: item.is_active 
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
      className="relative h-[35vh] sm:h-[40vh] md:h-[60vh] lg:h-[75vh] overflow-hidden bg-luxury-gray-light"
      role="region"
      aria-label="Hero banner"
    >
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
                  className="block md:hidden h-full w-full object-cover object-center"
                >
                  <source src={itemMobileUrl} type="video/mp4" />
                </video>
              </>
            ) : (
              <>
                <img
                  key={`${item.id}-desktop-image`}
                  src={itemDesktopUrl}
                  alt={item.title || "Hero"}
                  className="hidden md:block h-full w-full object-cover object-center"
                />
                <img
                  key={`${item.id}-mobile-image`}
                  src={itemMobileUrl}
                  alt={item.title || "Hero"}
                  className="block md:hidden h-full w-full object-cover object-center"
                />
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
      {heroItems.length === 0 && (
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
            className="block md:hidden h-full w-full object-cover object-center"
          >
            <source src={defaultVideoUrl} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black" style={{ opacity: 0.3 }} />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex h-full items-end justify-center pb-12 md:pb-20 lg:pb-24">
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
                className="inline-block border-2 border-luxury-gold bg-luxury-gold px-4 py-2 sm:px-8 sm:py-4 text-xs sm:text-sm font-medium uppercase tracking-wider text-luxury-navy transition-all hover:bg-transparent hover:text-white"
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
              className={`h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'w-8 bg-luxury-gold'
                  : 'w-2 bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
