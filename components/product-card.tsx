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
import React, { useState, useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { useRegion } from '@/contexts/RegionContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { BadgePercent, Ticket, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { Database } from '@/lib/supabase/database.types'
import { VoucherCountdown } from '@/components/VoucherCountdown'

type Product = Database['public']['Tables']['products']['Row']

interface ProductCardProps {
  product: Product
  className?: string
  noBorder?: boolean
  voucher?: {
    discount_type: 'percentage' | 'fixed'
    discount_value: number
    valid_until: string
  } | null
  activeDiscount?: {
    discounted_price: number
    variant_id?: string
  } | null
  sizeHint?: string
}

export function ProductCard({ product, className, noBorder = false, voucher, activeDiscount, sizeHint }: ProductCardProps) {
  const { region } = useRegion()
  const { t, locale } = useLanguage()
  const [mounted, setMounted] = useState(false)
  const [clientRegion, setClientRegion] = useState<typeof region | null>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isHovering, setIsHovering] = useState(false)
  const touchStartXRef = useRef(0)
  const [voucherExpired, setVoucherExpired] = useState(false)
  
  // Check if this is a bestselling card (minimal design)
  const isBestsellingCard = className?.includes('bestselling') || false

  // Combine variant images with product images (same logic as product detail page)
  const allProductImages = (() => {
    const hasVariants = (product as any).variants && Array.isArray((product as any).variants) && (product as any).variants.length > 0
    const variantImages = hasVariants 
      ? (product as any).variants
          .flatMap((v: any) => Array.isArray(v.image_url) ? v.image_url : (v.image_url ? [v.image_url] : [])).filter((url: any) => typeof url === 'string' && url.trim() !== '')
      : []
    
    return variantImages.length > 0 
      ? [...variantImages, ...(product.image_urls || [])]
      : (product.image_urls || [])
  })()

  useEffect(() => {
    setMounted(true)
    setClientRegion(region)
  }, [region])

  
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

  // Reorder images so the selected size variant's image is first when sizeHint is provided
  // Also track which images belong to the matching variant for hover logic
  const { orderedImages, matchingVariantImgs } = useMemo(() => {
    if (!sizeHint || !hasVariants) {
      return { orderedImages: allProductImages, matchingVariantImgs: new Set<string>() }
    }
    const variants = (product as any).variants as any[]
    const sizeNum = sizeHint.replace(/[^0-9]/g, '')
    const matchingVariant = variants.find((v: any) => {
      const vname = (v.name || '').toLowerCase().replace(/\s+/g, '')
      return vname.includes(`${sizeNum}ml`) || vname === sizeNum
    })
    if (!matchingVariant) {
      return { orderedImages: allProductImages, matchingVariantImgs: new Set<string>() }
    }
    const matchingImgs = (
      Array.isArray(matchingVariant.image_url)
        ? matchingVariant.image_url
        : matchingVariant.image_url ? [matchingVariant.image_url] : []
    ).filter((url: string) => typeof url === 'string' && url.trim() !== '' && !url.includes('placehold.co'))
    if (matchingImgs.length === 0) {
      return { orderedImages: allProductImages, matchingVariantImgs: new Set<string>() }
    }
    const otherImgs = allProductImages.filter((url: string) => !matchingImgs.includes(url))
    return {
      orderedImages: [...matchingImgs, ...otherImgs],
      matchingVariantImgs: new Set(matchingImgs),
    }
  }, [sizeHint, hasVariants, allProductImages, product])

  // Compute hover target: first image from a *different* variant when sizeHint is active
  const hoverIndex = useMemo(() => {
    if (sizeHint && matchingVariantImgs.size > 0) {
      const idx = orderedImages.findIndex(url => url && !url.includes('placehold.co') && !matchingVariantImgs.has(url))
      return idx >= 0 ? idx : 1
    }
    if (hasVariants) {
      const variants = (product as any).variants as any[]
      if (variants?.length >= 2) {
        const firstVariantImgs = (
          Array.isArray(variants[0].image_url)
            ? variants[0].image_url.filter(Boolean)
            : variants[0].image_url ? [variants[0].image_url] : []
        ).filter((u: string) => typeof u === 'string' && u.trim() !== '' && !u.includes('placehold.co'))
        return firstVariantImgs.length > 0 ? firstVariantImgs.length : 1
      }
    }
    return 1
  }, [hasVariants, product, sizeHint, orderedImages, matchingVariantImgs])

  // Reset to first image whenever the size hint changes
  useEffect(() => {
    setCurrentImageIndex(0)
  }, [sizeHint])

  // On hover: jump to hoverIndex (no auto-cycle)
  useEffect(() => {
    if (!isHovering) return
    if (!hasVariants) return // keep same image for products without variants
    const validImages = orderedImages.filter(url => url && !url.includes('placehold.co'))
    if (validImages.length > 1) {
      setCurrentImageIndex(Math.min(hoverIndex, validImages.length - 1))
    }
  }, [isHovering, hoverIndex, orderedImages, hasVariants])
  
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
  let displayPrice = originalPrice
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
  const isVideo = (url: any): boolean => {
    if (!url || typeof url !== 'string') return false
    return url.endsWith('.mp4') || url.endsWith('.mov') || url.includes('video')
  }
  
  // Check if product has variants with images
  const variantImages = hasVariants 
    ? (product as any).variants
        .flatMap((v: any) => Array.isArray(v.image_url) ? v.image_url : (v.image_url ? [v.image_url] : [])).filter((url: any) => typeof url === 'string' && !url.includes('placehold.co'))
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

  // Shared hover display URL (used by both card variants)
  const validAllImages = orderedImages.filter(url => url && !url.includes('placehold.co'))
  const displayThumbnailUrl = validAllImages[currentImageIndex] || thumbnailUrl

  // For bestselling cards, use minimal design matching reference image
  if (isBestsellingCard) {
    return (
      <Link
        href={`/products/${product.slug}`}
        className="block h-full"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => { setIsHovering(false); setCurrentImageIndex(0) }}
      >
        <div className={`group relative w-full h-full flex flex-col bg-white ${noBorder ? '' : 'border border-[#e0e0e0] hover:border-[#c0c0c0] transition-colors duration-200'}`}>
          {/* Product Image - tall portrait ratio */}
          <div className="relative w-full bg-white" style={{ paddingBottom: '105%' }}>
            {displayThumbnailUrl ? (
              <Image
                src={displayThumbnailUrl}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
                className="object-contain p-4 md:p-6 transition-transform duration-500 group-hover:scale-[1.03]"
                quality={90}
                loading="lazy"
                unoptimized={displayThumbnailUrl.includes('supabase')}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>

          {/* Voucher Discount Banner - Bestselling */}
          {voucher && !voucherExpired && (
            <div className="bg-luxury-gold px-2 py-1.5 flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <div className="bg-white/20 rounded-sm px-1 py-0.5 flex items-center justify-center">
                  <Ticket className="h-3 w-3 text-white" />
                </div>
                <span className="text-white text-[10px] md:text-xs font-bold">
                  {voucher.discount_type === 'percentage' 
                    ? `${voucher.discount_value}% Voucher`
                    : `Rp${voucher.discount_value.toLocaleString('id-ID')} Voucher`
                  }
                </span>
              </div>
              {mounted && (
                <VoucherCountdown validUntil={voucher.valid_until} onExpire={() => setVoucherExpired(true)} />
              )}
            </div>
          )}

          {/* Product Name + Price */}
          <div className="px-4 py-3 md:px-5 md:py-4 text-center">
            <h3 className="text-[9px] sm:text-[10px] md:text-xs font-montserrat font-normal uppercase tracking-[0.15em] text-[#1C2E4A] leading-snug mb-2">
              {product.name}
            </h3>
            {mounted && clientRegion && (() => {
              let basePrice = hasPriceRange ? minVariantPrice : originalPrice
              if (hasActiveDiscount) basePrice = displayPrice
              const voucherDiscount = voucher
                ? voucher.discount_type === 'percentage'
                  ? basePrice * voucher.discount_value / 100
                  : voucher.discount_value
                : 0
              const netPrice = basePrice - voucherDiscount
              if (!basePrice) return null
              
              return (
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  {(hasActiveDiscount || voucher) && (
                    <span className="text-[10px] text-gray-400 line-through">{formatPrice(basePrice, clientRegion.currency_code)}</span>
                  )}
                  <p className="text-[10px] md:text-xs font-montserrat font-semibold text-[#B8985F]">
                    {hasPriceRange && !voucher ? 'From ' : ''}{formatPrice(voucher ? netPrice : basePrice, clientRegion.currency_code)}
                  </p>
                </div>
              )
            })()}
          </div>
        </div>
      </Link>
    )
  }
  
  // Standard card — matches bestselling visual style + extra product info
  return (
    <div className={`group relative w-full flex flex-col bg-white ${noBorder ? '' : 'border border-[#e0e0e0] hover:border-[#c0c0c0] transition-colors duration-200'} ${className}`}>

      {/* Card link */}
      <Link
        href={`/products/${product.slug}`}
        className="flex flex-col flex-1"
        aria-label={`View ${product.name}`}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => { setIsHovering(false); setCurrentImageIndex(0) }}
      >
        {/* Image Frame — same portrait ratio as bestselling card */}
        <div
          className="relative w-full bg-white overflow-hidden select-none"
          style={{ paddingBottom: '105%' }}
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
          onTouchStart={(e) => { touchStartXRef.current = e.touches[0].clientX }}
          onTouchEnd={(e) => {
            const diff = touchStartXRef.current - e.changedTouches[0].clientX
            if (Math.abs(diff) > 40) {
              const validImages = orderedImages.filter(url => url && !url.includes('placehold.co'))
              if (diff > 0 && currentImageIndex < validImages.length - 1) {
                setCurrentImageIndex(prev => prev + 1)
              } else if (diff < 0 && currentImageIndex > 0) {
                setCurrentImageIndex(prev => prev - 1)
              }
            }
          }}
        >
          {/* NEW badge */}
          {daysSinceCreation <= newBadgeDuration && (
            <span className="absolute right-2 top-2 z-10 bg-luxury-gold text-white text-[9px] font-semibold uppercase tracking-[0.1em] px-1.5 py-0.5">
              NEW
            </span>
          )}
          {/* Halal badge */}
          {(product as any).halal_certified && (
            <span className="absolute left-2 top-2 z-10 border border-red-500 text-red-600 bg-white text-[9px] font-semibold uppercase tracking-[0.1em] px-1.5 py-0.5">
              Halal
            </span>
          )}
          {/* Out of Stock Overlay - Circular Badge */}
          {isOutOfStock && (
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-black/70 flex items-center justify-center">
                <span className="text-white text-sm md:text-base font-montserrat font-bold">
                  {locale === 'id' ? 'Habis' : 'Sold Out'}
                </span>
              </div>
            </div>
          )}
          {/* Image Navigation Arrows */}
          {(() => {
            const validImages = orderedImages.filter(url => url && !url.includes('placehold.co'))
            return validImages.length > 1 && (
              <>
                {/* Left Arrow */}
                {currentImageIndex > 0 && (
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      setCurrentImageIndex(prev => prev - 1)
                    }}
                    className="group/arrow absolute left-1 md:left-2 top-1/2 -translate-y-1/2 z-30 bg-white/90 hover:bg-[#B8985F] rounded-full p-1.5 shadow-md transition-all duration-200 active:scale-95"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-4 w-4 text-luxury-navy group-hover/arrow:text-white transition-colors duration-200" />
                  </button>
                )}
                {/* Right Arrow */}
                {currentImageIndex < validImages.length - 1 && (
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      setCurrentImageIndex(prev => prev + 1)
                    }}
                    className="group/arrow absolute right-1 md:right-2 top-1/2 -translate-y-1/2 z-30 bg-white/90 hover:bg-[#B8985F] rounded-full p-1.5 shadow-md transition-all duration-200 active:scale-95"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-4 w-4 text-luxury-navy group-hover/arrow:text-white transition-colors duration-200" />
                  </button>
                )}
                {/* Image Counter */}
                <div className="absolute bottom-2 right-2 z-30 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                  {currentImageIndex + 1}/{validImages.length}
                </div>
              </>
            )
          })()}
          
          {(() => {
            const validImages = orderedImages.filter(url => url && !url.includes('placehold.co'))
            const displayUrl = validImages[currentImageIndex] || thumbnailUrl
            return displayUrl ? (
              isVideo(displayUrl) ? (
                <video
                  src={displayUrl}
                  className="absolute inset-0 h-full w-full object-contain p-4 transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                  muted
                  playsInline
                />
            ) : (
                <Image
                  src={displayUrl}
                  alt={`${product.name} - ${product.category} fragrance`}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 260px"
                  className="object-contain p-4 transition-transform duration-500 ease-out group-hover:scale-[1.03] select-none pointer-events-none"
                  quality={90}
                  loading="lazy"
                  unoptimized={displayUrl.includes('supabase')}
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                  onMouseDown={(e) => e.preventDefault()}
                  onTouchStart={(e) => {
                    // Allow touch for navigation but prevent long press
                    const target = e.currentTarget
                    const timeout = setTimeout(() => {
                      target.style.pointerEvents = 'none'
                      setTimeout(() => {
                        target.style.pointerEvents = 'auto'
                      }, 100)
                    }, 500)
                    target.addEventListener('touchend', () => clearTimeout(timeout), { once: true })
                  }}
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    console.error('Image load error for:', product.name, displayUrl);
                    target.onerror = null;
                    target.src = '/images/placeholder-product.png';
                  }}
                />
              )
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )
          })()}
        </div>

        {/* Voucher Discount Banner - Mykonos Style */}
        {voucher && !voucherExpired && (
          <div className="bg-luxury-gold px-2 py-1.5 flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5">
              {/* Ticket icon */}
              <div className="bg-white/20 rounded-sm px-1 py-0.5 flex items-center justify-center">
                <Ticket className="h-3 w-3 text-white" />
              </div>
              <span className="text-white text-[10px] md:text-xs font-bold">
                {voucher.discount_type === 'percentage' 
                  ? `${voucher.discount_value}% Voucher`
                  : `Rp${voucher.discount_value.toLocaleString('id-ID')} Voucher`
                }
              </span>
            </div>
            {mounted && (
              <VoucherCountdown validUntil={voucher.valid_until} onExpire={() => setVoucherExpired(true)} />
            )}
          </div>
        )}

        {/* Content — centered, matching bestselling style */}
        <div className="px-3 pt-3 pb-4 text-center md:px-4 md:pt-4">
          {/* Name */}
          <h3 className="text-[9px] sm:text-[10px] md:text-xs font-montserrat font-normal uppercase tracking-[0.15em] text-[#1C2E4A] leading-snug mb-2">
            {product.name}
          </h3>

          {/* Price */}
          {mounted && clientRegion && (() => {
            let basePrice = hasPriceRange ? minVariantPrice : originalPrice
            if (hasActiveDiscount) basePrice = displayPrice
            const voucherDiscount = voucher
              ? voucher.discount_type === 'percentage'
                ? basePrice * voucher.discount_value / 100
                : voucher.discount_value
              : 0
            const netPrice = basePrice - voucherDiscount

            let discountPct = 0
            if (hasVariants && minVariantCompareAtPrice > 0 && minVariantCompareAtPrice > minVariantPrice) {
              discountPct = Math.round((minVariantCompareAtPrice - minVariantPrice) / minVariantCompareAtPrice * 100)
            } else if (!hasVariants) {
              const compareAt = clientRegion.code === 'ID' ? (product as any).compare_at_price_idr : (product as any).compare_at_price_usd
              if (compareAt && compareAt > originalPrice) discountPct = Math.round((compareAt - originalPrice) / compareAt * 100)
            }

            return (
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                {(hasActiveDiscount || voucher) && (
                  <span className="text-[10px] text-gray-400 line-through">{formatPrice(basePrice, clientRegion.currency_code)}</span>
                )}
                <span className="text-xs md:text-sm font-montserrat font-semibold text-[#B8985F]">
                  {hasPriceRange && !voucher ? 'From ' : ''}{formatPrice(voucher ? netPrice : basePrice, clientRegion.currency_code)}
                </span>
                {discountPct > 0 && !voucher && (
                  <span className="text-[9px] text-gray-400">-{discountPct}%</span>
                )}
              </div>
            )
          })()}

          {/* Rating + Sold */}
          {mounted && (product.rating > 0 || product.products_sold > 0) && (
            <div className="flex items-center justify-center gap-1.5 mt-1.5 text-xs md:text-sm font-montserrat text-gray-500">
              {product.rating > 0 && (
                <span className="flex items-center gap-0.5">
                  <svg className="h-3.5 w-3.5 md:h-4 md:w-4 fill-amber-400" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {product.rating.toFixed(1)}
                </span>
              )}
              {product.rating > 0 && product.products_sold > 0 && <span>·</span>}
              {product.products_sold > 0 && (
                <span>{product.products_sold >= 1000 ? `${Math.floor(product.products_sold / 1000)}k+` : `${product.products_sold}+`} {t.products.sold}</span>
              )}
            </div>
          )}
        </div>
      </Link>
    </div>
  )
}

