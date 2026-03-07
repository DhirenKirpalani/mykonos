'use client'

import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { Product } from '@/lib/types/product'
import { PriceDisplay } from '@/components/PriceDisplay'
import { useState } from 'react'
import { toast } from 'sonner'
import { ProductVariantModal } from '@/components/ProductVariantModal'
import { supabase } from '@/lib/supabase/client'

interface ProductCardProps {
  product: Product
  onAddToCart?: (productId: string) => void
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [showVariantModal, setShowVariantModal] = useState(false)
  const isOutOfStock = product.stock_quantity <= 0

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    
    if (isOutOfStock) {
      toast.error('Product is out of stock')
      return
    }

    setIsAdding(true)
    
    try {
      if (onAddToCart) {
        await onAddToCart(product.id)
      }
      toast.success('Added to cart!')
    } catch (error) {
      toast.error('Failed to add to cart')
    } finally {
      setIsAdding(false)
    }
  }

  const handleVariantAddToCart = async (productId: string, quantity: number, selectedVariants?: Record<string, string>) => {
    setIsAdding(true)
    try {
      // Get or create session (anonymous or authenticated)
      let { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        const { data, error } = await supabase.auth.signInAnonymously()
        if (error) {
          console.error('Failed to create anonymous session:', error)
          toast.error('Unable to add to cart. Please refresh the page.')
          return
        }
        session = data.session
        
        if (session?.user?.is_anonymous) {
          localStorage.setItem('anonymous_user_id', session.user.id)
        }
      }

      if (!session?.access_token) {
        toast.error('Unable to add to cart. Please refresh the page.')
        return
      }

      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          product_id: productId,
          quantity: quantity,
          variants: selectedVariants,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`${product.name} added to cart!`)
        window.dispatchEvent(new Event('cart-updated'))
      } else {
        console.error('Cart API error:', data)
        toast.error(data.error || 'Failed to add to cart')
      }
    } catch (error) {
      console.error('Add to cart error:', error)
      toast.error('Failed to add to cart')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <>
    <Link
      href={`/products/${product.slug}`}
      className={`group relative block overflow-hidden rounded-lg bg-white shadow-sm transition-all hover:shadow-lg ${
        isOutOfStock ? 'opacity-60' : ''
      }`}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-luxury-gray-light">
        {product.image_urls && product.image_urls[0] && (
          <img
            src={product.image_urls[0]}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
        
        {/* Badges */}
        <div className="absolute left-3 top-3 flex flex-col gap-2">
          {product.is_new && (
            <span className="rounded-full bg-luxury-gold px-3 py-1 text-xs font-medium text-luxury-navy">
              New
            </span>
          )}
          {product.sale_price && product.sale_price < product.price && (
            <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white">
              Sale
            </span>
          )}
          {isOutOfStock && (
            <span className="rounded-full bg-gray-600 px-3 py-1 text-xs font-medium text-white">
              Out of Stock
            </span>
          )}
        </div>

        {/* Quick Add to Cart */}
        {!isOutOfStock && (
          <button
            onClick={handleAddToCart}
            disabled={isAdding}
            className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-luxury-gold text-luxury-navy opacity-0 transition-all hover:bg-luxury-gold-light group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
            title="Add to cart"
          >
            <ShoppingCart className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {product.fragrance_family && (
          <p className="mb-1 text-xs text-muted-foreground">{product.fragrance_family}</p>
        )}
        <h3 className="mb-2 font-serif text-lg font-medium line-clamp-1">
          {product.name}
        </h3>
        <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
          {product.description}
        </p>
        <div className="flex items-center justify-between">
          <PriceDisplay
            price={product.price}
            salePrice={product.sale_price}
            showOriginal={true}
          />
          <span className="text-xs text-muted-foreground">{product.size}</span>
        </div>
      </div>
    </Link>
    </>
  )
}
