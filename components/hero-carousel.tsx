'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useTranslation } from '@/hooks/useTranslation'

interface HeroMedia {
  media_type: 'video' | 'image'
  media_url: string
}

export function HeroCarousel() {
  const { t } = useTranslation()
  const [heroMedia, setHeroMedia] = useState<HeroMedia | null>(null)

  useEffect(() => {
    fetchHeroMedia()
  }, [])

  const fetchHeroMedia = async () => {
    try {
      const { data, error } = await supabase
        .from('hero_media')
        .select('media_type, media_url')
        .eq('is_active', true)
        .single()

      if (data) {
        setHeroMedia(data)
      }
    } catch (error) {
      console.error('Error fetching hero media:', error)
    }
  }

  const defaultVideoUrl = "/assets/Blue and White Simple Elegant Minimalist Parfume Launching Soon Video.mp4"
  const mediaUrl = heroMedia?.media_url || defaultVideoUrl
  const isVideo = heroMedia?.media_type === 'video' || !heroMedia

  return (
    <div
      className="relative h-[35vh] sm:h-[40vh] md:h-[60vh] lg:h-[75vh] overflow-hidden bg-black"
      role="region"
      aria-label="Hero banner"
    >
      {/* Media Background */}
      <div className="absolute inset-0">
        {isVideo ? (
          <>
            {/* Desktop Video */}
            <video
              autoPlay
              loop
              muted
              playsInline
              className="hidden md:block h-full w-full object-cover object-center"
            >
              <source src={mediaUrl} type="video/mp4" />
            </video>

            {/* Mobile Video */}
            <video
              autoPlay
              loop
              muted
              playsInline
              className="block md:hidden h-full w-full object-cover object-[center_30%]"
            >
              <source src={mediaUrl} type="video/mp4" />
            </video>
          </>
        ) : (
          <img
            src={mediaUrl}
            alt="Hero"
            className="h-full w-full object-cover object-center"
          />
        )}

        {/* Dark overlay for luxury look */}
        <div className="absolute inset-0 bg-black/30" />

      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full items-end justify-center pb-12 md:pb-20 lg:pb-24">
        <div className="container mx-auto px-4 lg:px-8 text-center max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Link
              href="/products"
              className="inline-block border-2 border-luxury-gold bg-luxury-gold px-4 py-2 sm:px-8 sm:py-4 text-xs sm:text-sm font-medium uppercase tracking-wider text-luxury-navy transition-all hover:bg-transparent hover:text-white"
            >
              {t('home.shopNow')}
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
