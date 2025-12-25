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
      whileHover={{ y: -6 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="
        group relative
        w-full
        overflow-hidden
        rounded-xl md:rounded-2xl
        bg-gradient-to-b
        from-[#162742]
        via-[#0F1F36]
        to-[#0B1527]
        shadow-lg md:shadow-[0_35px_70px_-20px_rgba(0,0,0,0.55)]
      "
    >
      {/* NEW badge */}
      {product.is_new && (
        <span className="
          absolute left-3 top-3 z-10 md:left-5 md:top-5
          rounded-sm
          border border-[#C9B27C]/70
          bg-black/30
          px-2 py-0.5 md:px-3 md:py-1
          text-[10px] md:text-[11px]
          uppercase tracking-[0.2em] md:tracking-[0.3em]
          text-[#C9B27C]
          backdrop-blur
        ">
          New
        </span>
      )}

      {/* Card link */}
      <Link href={`/products/${product.slug}`} className="block h-full">
        {/* Image */}
        <div className="relative aspect-[3/4]">
          <Image
            src={product.image_urls[0]}
            alt={product.name}
            fill
            className="
              object-contain p-6 md:p-10
              transition-transform duration-700
              group-hover:scale-105
            "
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 340px"
          />

          {/* Light reflection */}
          <div className="
            pointer-events-none
            absolute inset-0
            bg-gradient-to-t
            from-black/40
            via-transparent
            to-white/10
            opacity-70
          " />
        </div>

        {/* Text */}
        <div className="px-4 py-4 text-center md:px-6 md:py-6">
          <h3 className="
            text-xs md:text-sm
            uppercase
            tracking-[0.25em] md:tracking-[0.35em]
            text-[#E6ECF5]
            line-clamp-1
          ">
            {product.name}
          </h3>

          <p className="
            mt-1.5 md:mt-2
            text-sm md:text-base
            text-[#A8B4C8]
          ">
            {formatPrice(product.price)}
          </p>
        </div>
      </Link>
    </motion.div>
  )
}

