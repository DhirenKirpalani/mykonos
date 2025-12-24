'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'

interface HeroSectionProps {
  title: string
  subtitle: string
  description?: string
  imageUrl: string
  ctaText: string
  ctaLink: string
  imagePosition?: 'left' | 'right'
}

export function HeroSection({
  title,
  subtitle,
  description,
  imageUrl,
  ctaText,
  ctaLink,
  imagePosition = 'right',
}: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden bg-luxury-gray-light">
      <div className="container mx-auto px-4 py-16 lg:px-8 lg:py-24">
        <div
          className={`grid items-center gap-12 lg:grid-cols-2 ${
            imagePosition === 'left' ? 'lg:flex-row-reverse' : ''
          }`}
        >
          <motion.div
            initial={{ opacity: 0, x: imagePosition === 'left' ? 50 : -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className={imagePosition === 'left' ? 'lg:order-2' : ''}
          >
            <p className="mb-2 text-sm font-medium uppercase tracking-wider text-luxury-gold">
              {subtitle}
            </p>
            <h1 className="mb-6 font-serif text-4xl font-bold leading-tight lg:text-6xl">
              {title}
            </h1>
            {description && (
              <p className="mb-8 max-w-xl text-lg text-muted-foreground">
                {description}
              </p>
            )}
            <Link href={ctaLink}>
              <Button variant="luxury" size="lg">
                {ctaText}
              </Button>
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: imagePosition === 'left' ? -50 : 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className={`relative aspect-[4/5] ${
              imagePosition === 'left' ? 'lg:order-1' : ''
            }`}
          >
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="rounded-lg object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
