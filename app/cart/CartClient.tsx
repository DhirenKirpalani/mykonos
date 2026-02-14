'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/common'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { formatPrice } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Trash2, Plus, Minus, ShoppingCart } from 'lucide-react'

type CartItem = {
  id: string
  product_id: string
  quantity: number
  price_at_add: number
  product: {
    id: string
    name: string
    slug: string
    image_urls: string[]
    size: string
    stock_quantity: number
  }
}

export function CartClient() {
  const router = useRouter()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    initializeAndFetchCart()
  }, [])

  const initializeAndFetchCart = async () => {
    try {
      // Get existing session (don't auto-create on cart page)
      let { data: { session } } = await supabase.auth.getSession()
      
      // If no session, try to load cached cart from localStorage
      if (!session) {
        const cachedCart = localStorage.getItem('cached_cart')
        if (cachedCart) {
          try {
            const parsedCart = JSON.parse(cachedCart)
            setCartItems(parsedCart)
          } catch (e) {
            console.error('Failed to parse cached cart:', e)
          }
        }
        setIsLoading(false)
        return
      }

      // Store or clear anonymous user_id based on session type
      if (session.user.is_anonymous) {
        localStorage.setItem('anonymous_user_id', session.user.id)
      } else {
        localStorage.removeItem('anonymous_user_id')
      }

      setUserId(session.user.id)

      // Fetch cart items for this user (anonymous or registered)
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          product:products(*)
        `)
        .eq('user_id', session.user.id)

      if (error) throw error

      const cartData = (data as any) || []
      setCartItems(cartData)
      
      // Cache cart in localStorage for offline/logged-out viewing
      if (cartData.length > 0) {
        localStorage.setItem('cached_cart', JSON.stringify(cartData))
      } else {
        localStorage.removeItem('cached_cart')
      }
    } catch (error) {
      console.error('Failed to fetch cart:', error)
      toast.error('Failed to load cart')
    } finally {
      setIsLoading(false)
    }
  }

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return

    try {
      const { error } = await (supabase
        .from('cart_items') as any)
        .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
        .eq('id', itemId)

      if (error) throw error

      setCartItems(prev =>
        prev.map(item =>
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        )
      )
      toast.success('Cart updated')
      
      // Dispatch event to update cart badge
      window.dispatchEvent(new Event('cart-updated'))
    } catch (error) {
      console.error('Failed to update quantity:', error)
      toast.error('Failed to update quantity')
    }
  }

  const removeItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      setCartItems(prev => prev.filter(item => item.id !== itemId))
      toast.success('Item removed from cart')
      
      // Dispatch event to update cart badge
      window.dispatchEvent(new Event('cart-updated'))
    } catch (error) {
      console.error('Failed to remove item:', error)
      toast.error('Failed to remove item')
    }
  }

  const subtotal = cartItems.reduce((sum, item) => sum + ((item.price_at_add || 0) * item.quantity), 0)
  const shipping = subtotal > 150 ? 0 : 15
  const total = subtotal + shipping

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (cartItems.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-lg border border-border/40 bg-luxury-gray-light/30 p-12">
        <ShoppingCart className="h-16 w-16 text-muted-foreground/40" />
        <div className="text-center">
          <h3 className="mb-2 font-serif text-xl font-medium">Your cart is empty</h3>
          <p className="mb-6 text-muted-foreground">
            Add some luxury pieces to get started
          </p>
          <Button 
            variant="luxury" 
            size="lg" 
            className="w-full"
            onClick={() => userId ? router.push('/checkout') : router.push('/login')}
          >
            {userId ? 'Proceed to Checkout' : 'Login to Checkout'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-6 sm:py-12 lg:px-8">
        <Breadcrumbs items={[
          { label: 'Cart', href: '/cart' }
        ]} />
        {!userId && cartItems.length > 0 && (
          <div className="mt-6 mb-6 rounded-lg bg-luxury-gold/10 border border-luxury-gold/30 p-4 text-center">
            <p className="text-sm font-medium text-luxury-navy">
              You're viewing your saved cart. <button onClick={() => router.push('/login')} className="underline font-semibold hover:text-luxury-gold">Login</button> to checkout or update items.
            </p>
          </div>
        )}
        <h1 className="mt-4 mb-6 font-serif text-3xl font-bold sm:mb-8 sm:text-4xl">Shopping Cart</h1>

        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-3 lg:gap-8">
          <div className="lg:col-span-2">
            <div className="space-y-3 sm:space-y-4">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-lg border border-border/40 p-3 sm:flex-row sm:gap-4 sm:p-4"
                >
                  <Link href={`/products/${item.product.slug}`} className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md bg-luxury-gray-light">
                    <Image
                      src={item.product.image_urls[0]}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  </Link>
                  <div className="flex flex-1 flex-col">
                    <div className="flex justify-between gap-2">
                      <div className="flex-1">
                        <Link href={`/products/${item.product.slug}`}>
                          <h3 className="font-medium hover:text-luxury-gold transition-colors">{item.product.name}</h3>
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {item.product.size}
                        </p>
                      </div>
                      <p className="font-medium">{formatPrice(item.price_at_add || 0)}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between sm:mt-auto">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="rounded-md p-1 hover:bg-luxury-gray-light disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={!userId || item.quantity <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="rounded-md p-1 hover:bg-luxury-gray-light disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={!userId || item.quantity >= item.product.stock_quantity}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <button
                        className="text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => removeItem(item.id)}
                        disabled={!userId}
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-lg border border-border/40 p-4 sm:p-6">
              <h2 className="mb-4 font-serif text-xl font-bold sm:text-2xl">
                Order Summary
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>
                    {shipping === 0 ? 'Free' : formatPrice(shipping)}
                  </span>
                </div>
                {subtotal < 150 && (
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    Add {formatPrice(150 - subtotal)} more for free shipping
                  </p>
                )}
                <div className="border-t border-border/40 pt-3">
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>
              </div>
              {userId ? (
                <Link href="/checkout" className="mt-4 block sm:mt-6">
                  <Button variant="luxury" size="lg" className="h-12 w-full text-base sm:h-auto">
                    Proceed to Checkout
                  </Button>
                </Link>
              ) : (
                <Link href="/login?redirect=/checkout" className="mt-4 block sm:mt-6">
                  <Button variant="luxury" size="lg" className="h-12 w-full text-base sm:h-auto">
                    Login to Checkout
                  </Button>
                </Link>
              )}
              <Link href="/products" className="mt-3 block">
                <Button variant="outline" size="lg" className="h-12 w-full text-base sm:h-auto">
                  Continue Shopping
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
