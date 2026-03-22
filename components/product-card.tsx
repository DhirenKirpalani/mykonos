// 'use client'

// import Image from 'next/image'
// import Link from 'next/link'
// import { motion } from 'framer-motion'
// import { ShoppingBag } from 'lucide-react'
// import { Button } from '@/components/ui/button'
// import { formatPrice } from '@/lib/utils'
// import { Database } from '@/lib/supabase/database.types'

// type Product = Database['public']['Tables']['products']['Row']

// interface ProductCardProps {
//   product: Product
// }

// export function ProductCard({ product }: ProductCardProps) {
//   const hasDiscount = product.sale_price && product.sale_price < product.price

//   return (
//     <motion.div
//       initial={{ opacity: 0, y: 20 }}
//       animate={{ opacity: 1, y: 0 }}
//       transition={{ duration: 0.5 }}
//       className="group relative"
//     >
//       <Link href={`/products/${product.slug}`}>
//         <div className="relative aspect-[3/4] overflow-hidden border border-stone-300 bg-white shadow-md transition-shadow duration-300 hover:shadow-xl">
//           <Image
//             src={product.image_urls[0]}
//             alt={product.name}
//             fill
//             className="object-contain p-8"
//             sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
//           />
//           {product.is_new && (
//             <div className="absolute left-4 top-4 border border-stone-400 bg-white/90 px-3 py-1 text-xs font-medium text-stone-700">
//               NEW
//             </div>
//           )}
//         </div>
//       </Link>
//       <div className="mt-4 text-center">
//         <Link href={`/products/${product.slug}`}>
//           <h3 className="font-sans text-sm font-bold uppercase tracking-wider text-stone-800 transition-colors hover:text-luxury-navy">
//             {product.name}
//           </h3>
//         </Link>
//         <p className="mt-1 text-sm text-stone-600">{formatPrice(product.price)}</p>
//       </div>
//     </motion.div>
//   )
// }

'use client'

import Image from 'next/image'
import Link from 'next/link'
import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useRegion } from '@/contexts/RegionContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { formatPrice } from '@/lib/utils'
import { Database } from '@/lib/supabase/database.types'

type Product = Database['public']['Tables']['products']['Row']

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { region } = useRegion()
  const { t, locale } = useLanguage()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Calculate days since product creation for debugging
  const daysSinceCreation = useMemo(() => {
    if (!product?.created_at) return 0
    try {
      const createdDate = new Date(product.created_at)
      if (isNaN(createdDate.getTime())) return 0
      return Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
    } catch {
      return 0
    }
  }, [product?.created_at])
  
  const newBadgeDuration = (product as any)?.new_product_duration_days || 30
  
  // Check if product has variants with different prices
  const hasVariants = (product as any).variants && Array.isArray((product as any).variants) && (product as any).variants.length > 0
  const variantPrices = hasVariants ? (product as any).variants.map((v: any) => 
    region?.code === 'ID' ? (v.price_idr || 0) : (v.price_usd || 0)
  ).filter((p: number) => p > 0) : []
  
  const minVariantPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : 0
  const maxVariantPrice = variantPrices.length > 0 ? Math.max(...variantPrices) : 0
  const hasPriceRange = hasVariants && minVariantPrice > 0 && maxVariantPrice > minVariantPrice
  
  // Get compare-at prices for variants
  const variantCompareAtPrices = hasVariants ? (product as any).variants.map((v: any) => 
    region?.code === 'ID' ? (v.compare_at_price_idr || 0) : (v.compare_at_price_usd || 0)
  ).filter((p: number) => p > 0) : []
  
  const minVariantCompareAtPrice = variantCompareAtPrices.length > 0 ? Math.min(...variantCompareAtPrices) : 0
  const maxVariantCompareAtPrice = variantCompareAtPrices.length > 0 ? Math.max(...variantCompareAtPrices) : 0
  const hasCompareAtPriceRange = hasVariants && minVariantCompareAtPrice > 0 && maxVariantCompareAtPrice > minVariantCompareAtPrice
  
  // Get price based on region
  const getPrice = () => {
    if (region?.code === 'ID' && (product as any).price_idr) {
      return (product as any).price_idr
    }
    return (product as any).price_usd || 0
  }
  
  // Check if first media is a video
  const isVideo = (url: string | undefined) => {
    if (!url) return false
    return url.endsWith('.mp4') || url.endsWith('.mov') || url.includes('video')
  }
  
  const firstMedia = product.image_urls?.[0]
  const isFirstMediaVideo = firstMedia ? isVideo(firstMedia) : false
  
  // If first media is video, try to find first image for thumbnail
  const thumbnailUrl = isFirstMediaVideo && product.image_urls && product.image_urls.length > 1
    ? product.image_urls.find(url => url && !isVideo(url)) || firstMedia
    : firstMedia

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className="
        group relative
        w-full
        overflow-hidden
        rounded-lg
        bg-[#FBF9F5]
        shadow-[0_2px_8px_rgba(0,0,0,0.08)]
        hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)]
        transition-shadow duration-300
      "
    >
      {/* Hall/ORI badge - Top left */}
      {(product as any).halal_certified && (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="
            absolute left-2 top-2 z-10
            rounded
            bg-red-600
            px-2 py-0.5
            text-[9px] md:text-[10px]
            uppercase tracking-wide
            text-white
            font-bold
          "
        >
          Hall | ORI
        </motion.span>
      )}
      
      {/* NEW badge - Top right */}
      {daysSinceCreation <= newBadgeDuration && (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="
            absolute right-2 top-2 z-10
            rounded
            bg-luxury-gold
            px-2 py-0.5
            text-[9px] md:text-[10px]
            uppercase tracking-wide
            text-white
            font-bold
          "
        >
          NEW
        </motion.span>
      )}

      {/* Card link */}
      <Link href={`/products/${product.slug}`} className="flex flex-col" aria-label={`View ${product.name}`}>
        {/* Image Frame - Fixed aspect ratio */}
        <div className="relative aspect-square bg-[#F1F4F8] overflow-hidden">
          {thumbnailUrl ? (
            isVideo(thumbnailUrl) ? (
              <video
                src={thumbnailUrl}
                className="
                  h-full w-full object-cover
                  transition-transform duration-500 ease-out
                  group-hover:scale-[1.04]
                "
                muted
                playsInline
              />
            ) : (
              <Image
                src={thumbnailUrl}
                alt={`${product.name} - ${product.category} fragrance`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 260px"
                className="
                  object-cover
                  transition-transform duration-500 ease-out
                  group-hover:scale-[1.04]
                "
                quality={90}
                priority
              />
            )
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-400">
              <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* Content - Fixed heights for consistency */}
        <div className="flex flex-col p-2 md:p-3">
          {/* Product Name - Fixed height */}
          <h3 className="
            text-[11px] md:text-sm
            text-[#1C2E4A]
            font-medium
            line-clamp-3 md:line-clamp-2
            transition-colors duration-200
            group-hover:text-[#1C2E4A]
            mb-1.5
            leading-tight
            h-[3rem] md:h-[2.5rem]
          ">
            {product.name}
          </h3>

          {/* Price with discount - Fixed height with extra space for strikethrough */}
          <div className="flex flex-col gap-0.5 mb-2 h-[3rem] md:h-[3rem]">
            <div className="flex items-center gap-2">
              <p className="
                text-sm md:text-lg
                text-[#1C2E4A]
                font-bold
              ">
                {region ? (
                  hasPriceRange 
                    ? `${formatPrice(minVariantPrice, region.currency_code)} - ${formatPrice(maxVariantPrice, region.currency_code)}`
                    : formatPrice(getPrice(), region.currency_code)
                ) : '...'}
              </p>
              {!hasPriceRange && product.sale_price && product.sale_price < getPrice() && (
                <span className="text-[10px] md:text-sm text-red-600 font-medium">
                  -{Math.round(((getPrice() - product.sale_price) / getPrice()) * 100)}%
                </span>
              )}
            </div>
            {/* Compare-at price for variants */}
            {hasPriceRange && (minVariantCompareAtPrice > minVariantPrice || maxVariantCompareAtPrice > maxVariantPrice) && (
              <p className="text-[10px] md:text-sm text-gray-400 line-through">
                {hasCompareAtPriceRange 
                  ? `${formatPrice(minVariantCompareAtPrice, region?.currency_code || 'USD')} - ${formatPrice(maxVariantCompareAtPrice, region?.currency_code || 'USD')}`
                  : formatPrice(minVariantCompareAtPrice || maxVariantCompareAtPrice, region?.currency_code || 'USD')
                }
              </p>
            )}
          </div>

          {/* Pilih Lokal Badge - Fixed height */}
          <div className="mb-1.5 h-[1.25rem]">
            {mounted && product.pilih_lokal && (
              <span className="inline-block rounded border border-[#1C2E4A] px-2 py-0.5 text-[9px] md:text-xs text-[#1C2E4A] font-medium">
                {t.products.pilihLokal}
              </span>
            )}
          </div>

          {/* Trust Signals - Rating & Sold Count - Fixed height */}
          <div className="h-[1.25rem] md:h-[1.5rem]">
            {mounted && (product.rating > 0 || product.products_sold > 0) && (
              <div className="flex items-center gap-1.5 text-[10px] md:text-sm">
              {product.rating > 0 && (
                <div className="flex items-center gap-1">
                  <svg className="h-3.5 w-3.5 md:h-4 md:w-4 fill-amber-500" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="font-semibold text-gray-900">{product.rating.toFixed(1)}</span>
                </div>
              )}
              {product.rating > 0 && product.products_sold > 0 && (
                <span className="text-gray-400">|</span>
              )}
              {product.products_sold > 0 && (
                <span className="text-gray-600">
                  {product.products_sold >= 1000
                    ? `${Math.floor(product.products_sold / 1000)}RB+`
                    : `${product.products_sold}+`} {t.products.sold}
                </span>
              )}
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

