'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Package, ChevronRight } from 'lucide-react'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { BackButton } from '@/components/common/BackButton'
import { LoadingSpinner } from '@/components/common'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'

type Order = {
  id: string
  order_number: string
  status: string
  total_amount: number
  currency_code: string
  created_at: string
  order_items: Array<{
    id: string
    quantity: number
    product: {
      name: string
      image_urls: string[]
    }
  }>
}

export default function OrdersPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useLanguage()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        // Check if user is logged in (not anonymous)
        if (!session || session.user.is_anonymous) {
          router.push('/login')
          return
        }
        
        setIsAuthenticated(true)
        
        // Fetch user orders with product information
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (
              id,
              quantity,
              product:products (
                name,
                image_urls
              )
            )
          `)
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching orders:', error)
        } else if (data) {
          setOrders(data as Order[])
        }
      } catch (error) {
        console.error('Authentication error:', error)
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (!isAuthenticated) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'text-green-600 bg-green-50'
      case 'shipped': return 'text-blue-600 bg-blue-50'
      case 'processing': return 'text-yellow-600 bg-yellow-50'
      case 'cancelled': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-border/40 bg-luxury-gray-light py-12">
        <div className="container mx-auto px-4 lg:px-8">
          <Breadcrumbs items={[
            { label: t.account.account, href: '/account' },
            { label: t.account.orders, href: '/account/orders' }
          ]} />
          <h1 className="mt-4 font-serif text-4xl font-bold lg:text-5xl">{t.account.orders}</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-4">
          <div className="space-y-2">
            <h2 className="font-serif text-xl font-bold">{t.account.account}</h2>
            <nav className="space-y-1">
              <Link 
                href="/account"
                className={cn(
                  "block w-full rounded-md px-4 py-2 text-left text-sm transition-colors",
                  pathname === '/account'
                    ? "bg-luxury-gold text-white"
                    : "hover:bg-luxury-gray-light"
                )}
              >
                {t.account.profile}
              </Link>
              <Link 
                href="/account/orders"
                className={cn(
                  "block w-full rounded-md px-4 py-2 text-left text-sm transition-colors",
                  pathname.startsWith('/account/orders')
                    ? "bg-luxury-gold text-white"
                    : "hover:bg-luxury-gray-light"
                )}
              >
                {t.account.orders}
              </Link>
              <Link 
                href="/account/settings"
                className={cn(
                  "block w-full rounded-md px-4 py-2 text-left text-sm transition-colors",
                  pathname === '/account/settings'
                    ? "bg-luxury-gold text-white"
                    : "hover:bg-luxury-gray-light"
                )}
              >
                {t.account.settings}
              </Link>
            </nav>
          </div>

          <div className="lg:col-span-3">
            {orders.length === 0 ? (
              <div className="rounded-lg border border-border/40 p-12 text-center">
                <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="font-serif text-2xl font-bold mb-2">{t.account.noOrdersYet}</h3>
                <p className="text-muted-foreground mb-6">{t.account.startShopping}</p>
                <Link href="/products" className="inline-block rounded-md bg-luxury-gold px-6 py-3 text-white hover:bg-luxury-gold/90 transition-colors">
                  {t.account.browseProducts}
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const firstProduct = order.order_items?.[0]?.product
                  const totalItems = order.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0
                  
                  return (
                    <Link
                      key={order.id}
                      href={`/account/orders/${order.id}`}
                      className="block rounded-lg border border-border/40 hover:border-luxury-gold transition-all hover:shadow-md overflow-hidden"
                    >
                      <div className="flex gap-3 p-3 sm:gap-4 sm:p-4">
                        {/* Product Image */}
                        {firstProduct && (
                          <div className="flex-shrink-0">
                            <img
                              src={firstProduct.image_urls?.[0] || '/placeholder.png'}
                              alt={firstProduct.name}
                              className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg"
                            />
                          </div>
                        )}
                        
                        {/* Order Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm sm:text-base mb-0.5">{order.order_number}</h3>
                              {firstProduct && (
                                <p className="text-xs sm:text-sm text-gray-700 mb-1 line-clamp-1">
                                  {firstProduct.name}
                                  {order.order_items.length > 1 && (
                                    <span className="text-muted-foreground ml-1">
                                      +{order.order_items.length - 1} more
                                    </span>
                                  )}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {new Date(order.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })} · {totalItems} {totalItems === 1 ? t.account.item : t.account.items}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                          </div>
                          
                          <div className="flex items-center justify-between gap-2 mt-2">
                            <span className={cn("px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs font-medium whitespace-nowrap", getStatusColor(order.status))}>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}
                            </span>
                            <span className="font-semibold text-xs sm:text-sm whitespace-nowrap">
                              {order.currency_code === 'IDR' 
                                ? `Rp. ${order.total_amount.toLocaleString('id-ID')}`
                                : order.currency_code === 'USD' 
                                ? `$${order.total_amount.toFixed(2)}`
                                : `${order.currency_code} ${order.total_amount.toFixed(2)}`
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
