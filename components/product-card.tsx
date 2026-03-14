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

      {/* Card link */}
      <Link href={`/products/${product.slug}`} className="flex flex-col h-full" aria-label={`View ${product.name}`}>
        {/* Image Frame - 70% of card height */}
        <div className="relative aspect-square bg-[#F1F4F8] overflow-hidden flex-[7]">
          {thumbnailUrl ? (
            isVideo(thumbnailUrl) ? (
              <video
                src={thumbnailUrl}
                className="
                  h-full w-full object-contain p-6 md:p-8
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
                className="
                  object-contain p-6 md:p-8
                  transition-transform duration-500 ease-out
                  group-hover:scale-[1.04]
                "
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 260px"
                quality={90}
                loading="lazy"
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

        {/* Text - 30% of card height */}
        <div className="px-2.5 py-2 md:px-3 md:py-2 flex-[3] flex flex-col justify-start">
          {/* Product Name - More lines on mobile */}
          <h3 className="
            text-[11px] md:text-sm
            text-[#1C2E4A]
            font-medium
            line-clamp-3 md:line-clamp-2
            transition-colors duration-200
            group-hover:text-[#1C2E4A]
            mb-1.5
            leading-tight
          ">
            {product.name}
          </h3>

          {/* Price with discount */}
          <div className="flex items-center gap-2 mb-1">
            <p className="
              text-sm md:text-lg
              text-[#1C2E4A]
              font-bold
            ">
              {region ? formatPrice(getPrice(), region.currency_code) : '...'}
            </p>
            {product.sale_price && product.sale_price < getPrice() && (
              <span className="text-[10px] md:text-sm text-red-600 font-medium">
                -{Math.round(((getPrice() - product.sale_price) / getPrice()) * 100)}%
              </span>
            )}
          </div>

          {/* Pilih Lokal Badge */}
          {product.pilih_lokal && (
            <div className="mb-1">
              <span className="inline-block rounded border border-[#1C2E4A] px-2 py-0.5 text-[9px] md:text-xs text-[#1C2E4A] font-medium">
                {locale === 'en' ? (t as any).products.pilihLokal : (t as any).produk.pilihLokal}
              </span>
            </div>
          )}

          {/* Trust Signals - Rating & Sold Count */}
          {(product.rating > 0 || product.products_sold > 0) && (
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
                    : `${product.products_sold}+`} {locale === 'en' ? (t as any).products.sold : (t as any).produk.sold}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  )
}

