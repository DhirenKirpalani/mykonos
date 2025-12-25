'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Trash2, Plus, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'

export default function CartPage() {
  const [cartItems] = useState<any[]>([])

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )
  const shipping = subtotal > 150 ? 0 : 15
  const total = subtotal + shipping

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-16 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="mb-4 font-serif text-4xl font-bold">Your Cart</h1>
            <p className="mb-8 text-lg text-muted-foreground">
              Your shopping cart is empty.
            </p>
            <Link href="/products">
              <Button variant="luxury" size="lg">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-6 sm:py-12 lg:px-8">
        <h1 className="mb-6 font-serif text-3xl font-bold sm:mb-8 sm:text-4xl">Shopping Cart</h1>

        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-3 lg:gap-8">
          <div className="lg:col-span-2">
            <div className="space-y-3 sm:space-y-4">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-lg border border-border/40 p-3 sm:flex-row sm:gap-4 sm:p-4"
                >
                  <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md bg-luxury-gray-light">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <div className="flex justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="font-medium">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {item.size}
                        </p>
                      </div>
                      <p className="font-medium">{formatPrice(item.price)}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between sm:mt-auto">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-9 w-9 sm:h-8 sm:w-8">
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-10 text-center sm:w-8">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-9 w-9 sm:h-8 sm:w-8">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-8 sm:w-8">
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
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
              <Link href="/checkout" className="mt-4 block sm:mt-6">
                <Button variant="luxury" size="lg" className="h-12 w-full text-base sm:h-auto">
                  Proceed to Checkout
                </Button>
              </Link>
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
