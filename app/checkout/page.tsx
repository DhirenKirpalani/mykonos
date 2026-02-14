'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { LoadingSpinner } from '@/components/common'
import { formatPrice } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { CreditCard, MapPin, Package } from 'lucide-react'

type CartItem = {
  id: string
  product_id: string
  quantity: number
  price_at_time: number
  product: {
    name: string
    image_urls: string[]
  }
}

type Address = {
  id: string
  full_name: string
  address_line1: string
  address_line2: string | null
  city: string
  state_province: string
  postal_code: string
  country: string
  phone: string
  is_default: boolean
}

export default function CheckoutPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string>('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('')

  useEffect(() => {
    fetchCheckoutData()
  }, [])

  const fetchCheckoutData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/login')
        return
      }

      // Fetch cart items
      const { data: cart, error: cartError } = await supabase
        .from('cart_items')
        .select(`
          *,
          product:products(name, image_urls)
        `)
        .eq('user_id', session.user.id)

      if (cartError) throw cartError

      if (!cart || cart.length === 0) {
        router.push('/cart')
        return
      }

      setCartItems(cart as any)

      // Fetch addresses
      const { data: addressData, error: addressError } = await supabase
        .from('shipping_addresses')
        .select('*')
        .eq('user_id', session.user.id)
        .order('is_default', { ascending: false })

      if (addressError) throw addressError

      const typedAddresses = (addressData as Address[]) || []
      setAddresses(typedAddresses)
      
      // Select default address
      const defaultAddress = typedAddresses.find(a => a.is_default)
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id)
      }

    } catch (error) {
      console.error('Failed to fetch checkout data:', error)
      toast.error('Failed to load checkout data')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      toast.error('Please select a shipping address')
      return
    }

    if (!selectedPaymentMethod) {
      toast.error('Please select a payment method')
      return
    }

    setIsProcessing(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const subtotal = cartItems.reduce((sum, item) => sum + item.price_at_time * item.quantity, 0)
      const shipping = subtotal > 150 ? 0 : 15
      const total = subtotal + shipping

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: session.user.id,
          shipping_address_id: selectedAddressId,
          payment_method: selectedPaymentMethod,
          subtotal_amount: subtotal,
          shipping_amount: shipping,
          tax_amount: 0,
          total_amount: total,
          currency_code: 'USD',
          status: 'pending',
        } as any)
        .select()
        .single()

      if (orderError) throw orderError

      // Create order items
      const orderItems = cartItems.map(item => ({
        order_id: (order as any).id,
        product_id: item.product_id,
        quantity: item.quantity,
        price_at_time: item.price_at_time,
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems as any)

      if (itemsError) throw itemsError

      // Clear cart
      const { error: clearError } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', session.user.id)

      if (clearError) throw clearError

      toast.success('Order placed successfully!')
      router.push(`/account/orders`)

    } catch (error) {
      console.error('Failed to place order:', error)
      toast.error('Failed to place order. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const subtotal = cartItems.reduce((sum, item) => sum + item.price_at_time * item.quantity, 0)
  const shipping = subtotal > 150 ? 0 : 15
  const total = subtotal + shipping

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-border/40 bg-luxury-gray-light py-12">
        <div className="container mx-auto px-4 lg:px-8">
          <Breadcrumbs items={[
            { label: 'Cart', href: '/cart' },
            { label: 'Checkout', href: '/checkout' }
          ]} />
          <h1 className="mt-4 mb-4 font-serif text-4xl font-bold lg:text-5xl">Checkout</h1>
          <p className="text-lg text-muted-foreground">Complete your purchase</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping Address */}
            <div className="rounded-lg border border-border/40 p-6">
              <div className="flex items-center gap-3 mb-4">
                <MapPin className="h-5 w-5 text-luxury-gold" />
                <h2 className="font-serif text-2xl font-bold">Shipping Address</h2>
              </div>
              
              {addresses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No shipping addresses found</p>
                  <Button variant="outline" onClick={() => router.push('/account/addresses')}>
                    Add Address
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((address) => (
                    <label
                      key={address.id}
                      className={`block rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                        selectedAddressId === address.id
                          ? 'border-luxury-gold bg-luxury-gold/5'
                          : 'border-border/40 hover:border-luxury-gold/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="address"
                        value={address.id}
                        checked={selectedAddressId === address.id}
                        onChange={(e) => setSelectedAddressId(e.target.value)}
                        className="sr-only"
                      />
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{address.full_name}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {address.address_line1}
                            {address.address_line2 && `, ${address.address_line2}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {address.city}, {address.state_province} {address.postal_code}
                          </p>
                          <p className="text-sm text-muted-foreground">{address.country}</p>
                          <p className="text-sm text-muted-foreground">{address.phone}</p>
                        </div>
                        {address.is_default && (
                          <span className="px-2 py-1 bg-luxury-gold text-white text-xs rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div className="rounded-lg border border-border/40 p-6">
              <div className="flex items-center gap-3 mb-4">
                <CreditCard className="h-5 w-5 text-luxury-gold" />
                <h2 className="font-serif text-2xl font-bold">Payment Method</h2>
              </div>
              
              <div className="space-y-3">
                <label className={`block rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                  selectedPaymentMethod === 'credit_card'
                    ? 'border-luxury-gold bg-luxury-gold/5'
                    : 'border-border/40 hover:border-luxury-gold/50'
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    value="credit_card"
                    checked={selectedPaymentMethod === 'credit_card'}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5" />
                    <span className="font-medium">Credit / Debit Card</span>
                  </div>
                </label>

                <label className={`block rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                  selectedPaymentMethod === 'bank_transfer'
                    ? 'border-luxury-gold bg-luxury-gold/5'
                    : 'border-border/40 hover:border-luxury-gold/50'
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    value="bank_transfer"
                    checked={selectedPaymentMethod === 'bank_transfer'}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5" />
                    <span className="font-medium">Bank Transfer</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-lg border border-border/40 p-6">
              <h2 className="mb-4 font-serif text-2xl font-bold">Order Summary</h2>
              
              <div className="space-y-3 mb-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3 text-sm">
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-luxury-gray-light">
                      <img
                        src={item.product.image_urls[0]}
                        alt={item.product.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-medium">{formatPrice(item.price_at_time * item.quantity)}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3 border-t border-border/40 pt-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
                </div>
                <div className="border-t border-border/40 pt-3">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>
              </div>

              <Button
                variant="luxury"
                size="lg"
                className="w-full mt-6"
                onClick={handlePlaceOrder}
                disabled={isProcessing || !selectedAddressId || !selectedPaymentMethod}
              >
                {isProcessing ? 'Processing...' : 'Place Order'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
