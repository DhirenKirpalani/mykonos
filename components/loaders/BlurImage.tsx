'use client'

import { useState } from 'react'
import Image from 'next/image'

interface BlurImageProps {
  src: string
  alt: string
  className?: string
  priority?: boolean
  fill?: boolean
  width?: number
  height?: number
  sizes?: string
  quality?: number
}

/**
 * Blur + Fade-in Image Loader
 * Perfect for hero sections and featured images
 * Loads image blurred, fades in once fully loaded
 */
export function BlurImage({
  src,
  alt,
  className = '',
  priority = false,
  fill = false,
  width,
  height,
  sizes,
  quality = 90,
}: BlurImageProps) {
  const [isLoading, setIsLoading] = useState(true)

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill={fill}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        sizes={sizes}
        quality={quality}
        priority={priority}
        className={`
          duration-700 ease-in-out
          ${isLoading ? 'scale-105 blur-lg' : 'scale-100 blur-0'}
        `}
        onLoadingComplete={() => setIsLoading(false)}
      />
      
      {/* Optional: Subtle overlay while loading */}
      {isLoading && (
        <div className="absolute inset-0 bg-luxury-navy/5 animate-pulse" />
      )}
    </div>
  )
}

/**
 * Hero Section with Blur Image
 * Complete hero component with blur-to-sharp loading
 */
export function HeroWithBlur({
  imageSrc,
  title,
  subtitle,
  ctaText,
  ctaHref,
}: {
  imageSrc: string
  title: string
  subtitle?: string
  ctaText?: string
  ctaHref?: string
}) {
  return (
    <div className="relative h-[600px] w-full overflow-hidden">
      <BlurImage
        src={imageSrc}
        alt={title}
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-luxury-navy/80 via-luxury-navy/40 to-transparent" />
      
      {/* Content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center text-white px-4">
          <h1 className="font-serif text-5xl md:text-7xl font-medium tracking-wide mb-4">
            {title}
          </h1>
          {subtitle && (
            <p className="text-lg md:text-xl text-white/90 mb-8">
              {subtitle}
            </p>
          )}
          {ctaText && ctaHref && (
            <a
              href={ctaHref}
              className="inline-block bg-luxury-gold text-luxury-navy px-8 py-3 rounded-lg font-semibold hover:bg-luxury-gold/90 transition-colors"
            >
              {ctaText}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
