'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'
import { Database } from '@/lib/supabase/database.types'

type Product = Database['public']['Tables']['products']['Row']

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const hasDiscount = product.sale_price && product.sale_price < product.price

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="group relative"
    >
      <Link href={`/products/${product.slug}`}>
        <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-luxury-gray-light">
          <Image
            src={product.image_urls[0]}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {product.is_new && (
            <div className="absolute left-4 top-4 rounded-full bg-luxury-gold px-3 py-1 text-xs font-medium text-white">
              NEW
            </div>
          )}
          {hasDiscount && (
            <div className="absolute right-4 top-4 rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white">
              SALE
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />
          <div className="absolute inset-x-0 bottom-0 translate-y-full transition-transform duration-300 group-hover:translate-y-0">
            <div className="bg-white/95 p-4 backdrop-blur-sm">
              <Button
                variant="luxury"
                size="sm"
                className="w-full"
                onClick={(e) => {
                  e.preventDefault()
                }}
              >
                <ShoppingBag className="mr-2 h-4 w-4" />
                Quick Add
              </Button>
            </div>
          </div>
        </div>
      </Link>
      <div className="mt-4 space-y-1">
        <Link href={`/products/${product.slug}`}>
          <h3 className="font-serif text-lg font-medium transition-colors hover:text-luxury-gold">
            {product.name}
          </h3>
        </Link>
        <p className="text-sm text-muted-foreground">{product.size}</p>
        <div className="flex items-center gap-2">
          {hasDiscount ? (
            <>
              <span className="font-medium text-luxury-gold">
                {formatPrice(product.sale_price!)}
              </span>
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.price)}
              </span>
            </>
          ) : (
            <span className="font-medium">{formatPrice(product.price)}</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
