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
import { formatPrice } from '@/lib/utils'
import { Database } from '@/lib/supabase/database.types'

type Product = Database['public']['Tables']['products']['Row']

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
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
      {/* NEW badge */}
      {product.is_new && (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="
            absolute left-3 top-3 z-10
            rounded-sm
            border border-[#C2A36B]
            bg-[#1C2E4A]
            px-2.5 py-1
            text-[10px]
            uppercase tracking-[0.2em]
            text-[#FFFFFF]
            font-medium
          "
        >
          NEW
        </motion.span>
      )}

      {/* Card link */}
      <Link href={`/products/${product.slug}`} className="block h-full" aria-label={`View ${product.name}`}>
        {/* Image Frame */}
        <div className="relative aspect-[3/4] bg-[#F1F4F8] overflow-hidden">
          <Image
            src={product.image_urls[0]}
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
        </div>

        {/* Text */}
        <div className="px-3 py-3 text-center md:px-4 md:py-4">
          <h3 className="
            text-[11px] md:text-xs
            uppercase
            tracking-[0.15em] md:tracking-[0.2em]
            text-[#1C2E4A]
            font-medium
            line-clamp-1
            transition-colors duration-200
            group-hover:text-[#1C2E4A]
          ">
            {product.name}
          </h3>

          <p className="
            mt-1.5 md:mt-2
            text-xs md:text-sm
            text-[#8A6A3F]
            font-medium
            tracking-wide
            transition-all duration-300
            group-hover:tracking-wider
          ">
            {formatPrice(product.price)}
          </p>
        </div>
      </Link>
    </motion.div>
  )
}

