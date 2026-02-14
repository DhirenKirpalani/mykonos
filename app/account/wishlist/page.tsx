'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Heart, Trash2, ShoppingBag } from 'lucide-react'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { BackButton } from '@/components/common/BackButton'
import { LoadingSpinner } from '@/components/common'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

type WishlistItem = {
  id: string
  product_id: string
  created_at: string
  product: {
    id: string
    name: string
    slug: string
    price: number
    sale_price: number | null
    image_urls: string[]
    stock_quantity: number
  }
}

export default function WishlistPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/login')
      } else {
        setIsAuthenticated(true)
        await fetchWishlist(session.user.id)
      }
      setIsLoading(false)
    }

    checkAuth()
  }, [router])

  const fetchWishlist = async (userId: string) => {
    const { data, error } = await supabase
      .from('wishlist_items' as any)
      .select(`
        *,
        product:products(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (data && !error) {
      setWishlistItems(data as any)
    }
  }

  const removeFromWishlist = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('wishlist_items' as any)
        .delete()
        .eq('id', itemId)

      if (error) throw error

      setWishlistItems(prev => prev.filter(item => item.id !== itemId))
      toast.success('Removed from wishlist')
      
      // Dispatch event to update wishlist badge
      window.dispatchEvent(new Event('wishlist-updated'))
    } catch (error) {
      console.error('Failed to remove item:', error)
      toast.error('Failed to remove item')
    }
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-border/40 bg-luxury-gray-light py-12">
        <div className="container mx-auto px-4 lg:px-8">
          <Breadcrumbs items={[
            { label: 'Wishlist', href: '/account/wishlist' }
          ]} />
          <h1 className="mt-4 font-serif text-4xl font-bold lg:text-5xl">My Wishlist</h1>
          <p className="mt-2 text-lg text-muted-foreground">Products you love</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 lg:px-8">
        <div>
          {wishlistItems.length === 0 ? (
            <div className="rounded-lg border border-border/40 p-12 text-center">
              <Heart className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="font-serif text-2xl font-bold mb-2">Your wishlist is empty</h3>
              <p className="text-muted-foreground mb-6">Save products you love to your wishlist</p>
              <Link href="/products" className="inline-block rounded-md bg-luxury-gold px-6 py-3 text-white hover:bg-luxury-gold/90 transition-colors">
                Browse Products
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {wishlistItems.map((item) => (
                  <div key={item.id} className="group relative rounded-lg border border-border/40 overflow-hidden hover:border-luxury-gold transition-colors">
                    <Link href={`/products/${item.product.slug}`}>
                      <div className="aspect-square overflow-hidden bg-gray-100">
                        <img
                          src={item.product.image_urls[0]}
                          alt={item.product.name}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold mb-2">{item.product.name}</h3>
                        <div className="flex items-center gap-2">
                          {item.product.sale_price ? (
                            <>
                              <span className="font-bold text-luxury-gold">${item.product.sale_price.toFixed(2)}</span>
                              <span className="text-sm text-gray-500 line-through">${item.product.price.toFixed(2)}</span>
                            </>
                          ) : (
                            <span className="font-bold">${item.product.price.toFixed(2)}</span>
                          )}
                        </div>
                        {item.product.stock_quantity === 0 && (
                          <p className="text-sm text-red-600 mt-2">Out of stock</p>
                        )}
                      </div>
                    </Link>
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button
                        onClick={async () => {
                          const { data: { session } } = await supabase.auth.getSession()
                          if (!session) return
                          
                          // Add to cart
                          const response = await fetch('/api/cart', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              product_id: item.product_id,
                              quantity: 1,
                            }),
                          })
                          
                          if (response.ok) {
                            // Remove from wishlist
                            await removeFromWishlist(item.id)
                            toast.success('Moved to cart!')
                            // Dispatch event to update cart badge
                            window.dispatchEvent(new Event('cart-updated'))
                          }
                        }}
                        className="p-2 rounded-full bg-luxury-gold/90 hover:bg-luxury-gold text-white shadow-md transition-colors"
                        aria-label="Move to cart"
                        title="Move to cart"
                      >
                        <ShoppingBag className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removeFromWishlist(item.id)}
                        className="p-2 rounded-full bg-white/90 hover:bg-white shadow-md transition-colors"
                        aria-label="Remove from wishlist"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
