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
import { BadgePercent, Ticket } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { Database } from '@/lib/supabase/database.types'

type Product = Database['public']['Tables']['products']['Row']

interface ProductCardProps {
  product: Product
  className?: string
  voucher?: {
    discount_type: 'percentage' | 'fixed'
    discount_value: number
    valid_until: string
  } | null
  activeDiscount?: {
    discounted_price: number
    variant_id?: string
  } | null
}

export function ProductCard({ product, className, voucher, activeDiscount }: ProductCardProps) {
  const { region } = useRegion()
  const { t, locale } = useLanguage()
  const [mounted, setMounted] = useState(false)
  const [clientRegion, setClientRegion] = useState<typeof region | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isHovering, setIsHovering] = useState(false)

  // Combine variant images with product images (same logic as product detail page)
  const allProductImages = (() => {
    const hasVariants = (product as any).variants && Array.isArray((product as any).variants) && (product as any).variants.length > 0
    const variantImages = hasVariants 
      ? (product as any).variants
          .map((v: any) => v.image_url)
          .filter((url: string) => url && url.trim() !== '')
      : []
    
    return variantImages.length > 0 
      ? [...variantImages, ...(product.image_urls || [])]
      : (product.image_urls || [])
  })()

  useEffect(() => {
    setMounted(true)
    setClientRegion(region)
  }, [region])

  useEffect(() => {
    if (!voucher?.valid_until || !mounted) return

    const calculateTimeRemaining = () => {
      const endDate = new Date(new Date(voucher.valid_until).toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
      const nowJakarta = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
      const difference = endDate.getTime() - nowJakarta.getTime()

      if (difference > 0) {
        const totalMinutes = Math.floor(difference / (1000 * 60))
        const hours = Math.floor(totalMinutes / 60)
        const minutes = totalMinutes % 60
        
        if (hours > 0) {
          return `Sisa ${hours} jam ${minutes} menit`
        } else if (minutes > 0) {
          return `Sisa ${minutes} menit`
        } else {
          return 'Sisa < 1 menit'
        }
      }
      return ''
    }

    setTimeRemaining(calculateTimeRemaining())

    const timer = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining())
    }, 60000) // Update every minute

    return () => clearInterval(timer)
  }, [voucher?.valid_until, mounted])
  
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
  
  // Check if product is out of stock
  const isOutOfStock = useMemo(() => {
    if (hasVariants) {
      // If has variants, check if ALL variants are out of stock
      return (product as any).variants.every((v: any) => v.stock_quantity === 0)
    }
    // Otherwise check product-level stock
    return product.stock_quantity === 0
  }, [hasVariants, product])
  
  const variantPrices = hasVariants ? (product as any).variants.map((v: any) => 
    clientRegion?.code === 'ID' ? (v.price_idr || 0) : (v.price_usd || 0)
  ).filter((p: number) => p > 0) : []
  
  const minVariantPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : 0
  const maxVariantPrice = variantPrices.length > 0 ? Math.max(...variantPrices) : 0
  const hasPriceRange = hasVariants && minVariantPrice > 0 && maxVariantPrice > minVariantPrice
  
  // Get compare-at prices for variants
  const variantCompareAtPrices = hasVariants ? (product as any).variants.map((v: any) => 
    clientRegion?.code === 'ID' ? (v.compare_at_price_idr || 0) : (v.compare_at_price_usd || 0)
  ).filter((p: number) => p > 0) : []
  
  const minVariantCompareAtPrice = variantCompareAtPrices.length > 0 ? Math.min(...variantCompareAtPrices) : 0
  const maxVariantCompareAtPrice = variantCompareAtPrices.length > 0 ? Math.max(...variantCompareAtPrices) : 0
  const hasCompareAtPriceRange = hasVariants && minVariantCompareAtPrice > 0 && maxVariantCompareAtPrice > minVariantCompareAtPrice
  
  // Get price based on region
  const getPrice = () => {
    if (clientRegion?.code === 'ID' && (product as any).price_idr) {
      return (product as any).price_idr
    }
    return (product as any).price_usd || 0
  }
  
  // Apply discount campaign price if active
  let originalPrice = getPrice()
  let displayPrice = hasPriceRange ? minVariantPrice : originalPrice
  let hasActiveDiscount = false
  
  // For products with variants, we need to find the original price of the discounted variant
  if (activeDiscount && activeDiscount.discounted_price) {
    displayPrice = activeDiscount.discounted_price
    
    // Find the original price of the variant that has this discount
    if (hasVariants && activeDiscount.variant_id) {
      const discountedVariant = (product as any).variants?.find((v: any) => v.name === activeDiscount.variant_id)
      if (discountedVariant) {
        originalPrice = clientRegion?.code === 'ID' ? (discountedVariant.price_idr || 0) : (discountedVariant.price_usd || 0)
      }
    }
    
    hasActiveDiscount = activeDiscount.discounted_price < originalPrice
  }
  
  // Check if first media is a video
  const isVideo = (url: string) => {
    if (!url) return false
    return url.endsWith('.mp4') || url.endsWith('.mov') || url.includes('video')
  }
  
  // Check if product has variants with images
  const variantImages = hasVariants 
    ? (product as any).variants
        .map((v: any) => v.image_url)
        .filter((url: string) => url && !url.includes('placehold.co'))
    : []
  
  // Filter out invalid placeholder URLs from product images
  const validImageUrls = product.image_urls?.filter(url => 
    url && !url.includes('placehold.co')
  ) || []
  
  // Prioritize variant images over product images for thumbnail
  const allMediaUrls = variantImages.length > 0 
    ? [...variantImages, ...validImageUrls]
    : validImageUrls
  
  const firstMedia = allMediaUrls[0]
  const isFirstMediaVideo = firstMedia ? isVideo(firstMedia) : false
  
  // If first media is video, try to find first image for thumbnail
  const thumbnailUrl = isFirstMediaVideo && allMediaUrls.length > 1
    ? allMediaUrls.find(url => url && !isVideo(url)) || firstMedia
    : firstMedia

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className={`group relative
        w-full h-full
        flex flex-col
        overflow-hidden
        rounded-lg
        bg-[#FBF9F5]
        shadow-[0_2px_8px_rgba(0,0,0,0.08)]
        hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)]
        transition-shadow duration-300 ${className}`}
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
      <Link 
        href={`/products/${product.slug}`} 
        className="flex flex-col" 
        aria-label={`View ${product.name}`}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => {
          setIsHovering(false)
          setCurrentImageIndex(0)
        }}
      >
        {/* Image Frame - Fixed aspect ratio */}
        <div 
          className="relative aspect-square bg-[#F1F4F8] overflow-hidden group/image"
          onTouchStart={(e) => {
            const touch = e.touches[0]
            const startX = touch.clientX
            const handleTouchMove = (e: TouchEvent) => {
              const touch = e.touches[0]
              const diff = startX - touch.clientX
              if (Math.abs(diff) > 50) {
                const validImages = allProductImages.filter(url => url && !url.includes('placehold.co'))
                if (diff > 0 && currentImageIndex < validImages.length - 1) {
                  setCurrentImageIndex(prev => prev + 1)
                } else if (diff < 0 && currentImageIndex > 0) {
                  setCurrentImageIndex(prev => prev - 1)
                }
                document.removeEventListener('touchmove', handleTouchMove)
              }
            }
            document.addEventListener('touchmove', handleTouchMove, { once: true })
          }}
        >
          {/* Out of Stock Overlay - Circular Badge */}
          {isOutOfStock && (
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-black/70 flex items-center justify-center">
                <span className="text-white text-sm md:text-base font-bold">
                  {locale === 'id' ? 'Habis' : 'Sold Out'}
                </span>
              </div>
            </div>
          )}
          {/* Image Navigation Dots */}
          {(() => {
            const validImages = allProductImages.filter(url => url && !url.includes('placehold.co'))
            return validImages.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 flex gap-1">
                {validImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.preventDefault()
                      setCurrentImageIndex(index)
                    }}
                    className={`h-1.5 rounded-full transition-all ${
                      index === currentImageIndex
                        ? 'w-4 bg-luxury-gold'
                        : 'w-1.5 bg-white/60 hover:bg-white/80'
                    }`}
                    aria-label={`View image ${index + 1}`}
                  />
                ))}
              </div>
            )
          })()}
          
          {(() => {
            const validImages = allProductImages.filter(url => url && !url.includes('placehold.co'))
            const displayUrl = validImages[currentImageIndex] || thumbnailUrl
            return displayUrl ? (
              isVideo(displayUrl) ? (
                <video
                  src={displayUrl}
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
                  src={displayUrl}
                  alt={`${product.name} - ${product.category} fragrance`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 260px"
                  className="
                    object-cover
                    transition-all duration-300 ease-out
                    group-hover:scale-[1.04]
                  "
                  quality={90}
                  loading="lazy"
                  unoptimized={displayUrl.includes('supabase')}
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    console.error('Image load error for:', product.name, displayUrl);
                    target.onerror = null;
                    target.src = '/images/placeholder-product.png';
                  }}
                />
              )
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-400">
                <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )
          })()}
        </div>

        {/* Voucher Discount Banner - Mykonos Style */}
        {voucher && (
          <div className="bg-luxury-gold px-2 py-1.5 flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5">
              {/* Ticket icon */}
              <div className="bg-white/20 rounded-sm px-1 py-0.5 flex items-center justify-center">
                <Ticket className="h-3 w-3 text-white" />
              </div>
              <span className="text-white text-[10px] md:text-xs font-bold">
                Diskon Rp.{voucher.discount_type === 'percentage' 
                  ? `${(voucher.discount_value * 1000).toLocaleString('id-ID')}`
                  : `${voucher.discount_value.toLocaleString('id-ID')}`
                }RB
              </span>
            </div>
            {mounted && timeRemaining && (
              <span className="text-white text-[10px] md:text-xs font-bold">
                {timeRemaining}
              </span>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex flex-col flex-1 p-2 md:p-3">
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

          {/* Price with discount */}
          {(() => {
            // Determine base display price
            let basePrice = hasPriceRange ? minVariantPrice : originalPrice
            
            // Apply discount campaign price if active
            if (hasActiveDiscount) {
              basePrice = displayPrice
            }

            // Apply voucher discount
            const voucherDiscount = voucher ? (
              voucher.discount_type === 'percentage' 
                ? (basePrice * voucher.discount_value / 100)
                : voucher.discount_value
            ) : 0
            const netPrice = basePrice - voucherDiscount

            // Compute discount percent from compare-at
            let discountPct = 0
            if (hasVariants && minVariantCompareAtPrice > 0 && minVariantCompareAtPrice > minVariantPrice) {
              discountPct = Math.round((minVariantCompareAtPrice - minVariantPrice) / minVariantCompareAtPrice * 100)
            } else if (!hasVariants && clientRegion) {
              const compareAt = clientRegion.code === 'ID' ? (product as any).compare_at_price_idr : (product as any).compare_at_price_usd
              if (compareAt && compareAt > originalPrice) {
                discountPct = Math.round((compareAt - originalPrice) / compareAt * 100)
              }
            }

            return (
              <div className="flex flex-col gap-0.5">
                {hasActiveDiscount && (
                  <div className="text-xs text-gray-500 line-through">
                    {clientRegion ? formatPrice(originalPrice, clientRegion.currency_code) : '...'}
                  </div>
                )}
                <div className="flex items-center gap-1.5 mb-1.5 flex-nowrap">
                  <p className="text-sm md:text-base text-luxury-navy font-bold">
                    {clientRegion ? formatPrice(voucher ? netPrice : basePrice, clientRegion.currency_code) : '...'}
                  </p>
                  {(discountPct > 0 || hasActiveDiscount) && !voucher && (
                    <span className="text-[10px] md:text-xs text-gray-500 font-medium">
                      -{hasActiveDiscount ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100) : discountPct}%
                    </span>
                  )}
                  {voucher && (
                    <div className="relative bg-white rounded-full p-1">
                      <svg className="h-4 w-4 md:h-5 md:w-5 text-luxury-gold" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 10h1a1 1 0 0 0 0-2H9a1 1 0 0 0 0 2Zm0 2a1 1 0 0 0 0 2h1a1 1 0 0 0 0-2H9Zm12 5.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-1a1.5 1.5 0 0 0 0-3v-1a1.5 1.5 0 0 0 0-3v-1A1.5 1.5 0 0 1 4.5 7h15A1.5 1.5 0 0 1 21 8.5v1a1.5 1.5 0 0 0 0 3v1a1.5 1.5 0 0 0 0 3v1ZM20 8.5h-1.5a1 1 0 0 1-1-1V7H4.5v.5a1 1 0 0 1-1 1H3v1h.5a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H3v1h.5a1 1 0 0 1 1 1v.5h15v-.5a1 1 0 0 1 1-1h.5v-1h-.5a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1h.5v-1Zm-2.5 4.5a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm0-3a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm-12 3a1 1 0 1 0-2 0 1 1 0 0 0 2 0Zm0-3a1 1 0 1 0-2 0 1 1 0 0 0 2 0Z"/>
                      </svg>
                      <svg className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 md:h-3 md:w-3 bg-white rounded-full" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="11" fill="#EE4D2D"/>
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="white"/>
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            )
          })()}

          {/* Spacer to push badge/rating to bottom */}
          <div className="flex-1" />

          {/* Pilih Lokal Badge */}
          <div className="mb-1.5 min-h-[1.25rem]">
            {mounted && product.pilih_lokal && (
              <span className="inline-block rounded border border-[#1C2E4A] px-2 py-0.5 text-[9px] md:text-xs text-[#1C2E4A] font-medium">
                {t.products.pilihLokal}
              </span>
            )}
          </div>

          {/* Trust Signals - Rating & Sold Count */}
          <div>
            {mounted && (product.rating > 0 || product.products_sold > 0) && (
              <div className="flex items-center gap-1.5 text-xs md:text-sm">
              {product.rating > 0 && (
                <div className="flex items-center gap-1">
                  <svg className="h-4 w-4 md:h-4 md:w-4 fill-amber-500" viewBox="0 0 20 20">
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
                    ? `${Math.floor(product.products_sold / 1000)}k+`
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

