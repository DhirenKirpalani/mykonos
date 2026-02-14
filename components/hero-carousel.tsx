'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

export function HeroCarousel() {
  return (
    <div
      className="relative h-[35vh] sm:h-[40vh] md:h-[60vh] lg:h-[75vh] overflow-hidden bg-black"
      role="region"
      aria-label="Hero banner"
    >
      {/* Video Background */}
      <div className="absolute inset-0">

        {/* Desktop Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="hidden md:block h-full w-full object-cover object-center"
        >
          <source
            src="/assets/Blue and White Simple Elegant Minimalist Parfume Launching Soon Video.mp4"
            type="video/mp4"
          />
        </video>

        {/* Mobile Video (same video but better crop positioning) */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="block md:hidden h-full w-full object-cover object-[center_30%]"
        >
          <source
            src="/assets/Blue and White Simple Elegant Minimalist Parfume Launching Soon Video.mp4"
            type="video/mp4"
          />
        </video>

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
              className="inline-block border-2 border-luxury-gold bg-luxury-gold px-8 py-4 text-sm font-medium uppercase tracking-wider text-luxury-navy transition-all hover:bg-transparent hover:text-white"
            >
              Explore Collection
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
