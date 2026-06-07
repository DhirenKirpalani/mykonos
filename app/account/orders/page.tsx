'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Package, ChevronRight, ChevronLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'

type Order = {
  id: string
  order_number: string
  status: string
  total_amount: number
  subtotal_amount?: number
  discount_amount?: number
  shipping_amount?: number
  tax_amount?: number
  currency_code: string
  created_at: string
  order_items: Array<{
    id: string
    quantity: number
    variant_name?: string | null
    product: {
      name: string
      image_urls: string[]
      variants?: Array<{
        name: string
        sku: string
        image_url?: string
      }>
    }
  }>
}

const ORDERS_PER_PAGE = 10

export default function OrdersPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { t } = useLanguage()
  const [isLoading, setIsLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalOrders, setTotalOrders] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user || user.is_anonymous) return

    const fetchOrders = async (page = 1, append = false) => {
      if (append) setIsLoadingMore(true)
      else setIsLoading(true)

      const from = (page - 1) * ORDERS_PER_PAGE
      const to = from + ORDERS_PER_PAGE - 1

      // Get total count
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if (count !== null) setTotalOrders(count)

      // Get paginated data
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            variant_name,
            product:products (
              name,
              image_urls,
              variants
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) {
        console.error('Error fetching orders:', error)
      } else if (data) {
        if (append) {
          setOrders(prev => [...prev, ...(data as Order[])])
        } else {
          setOrders(data as Order[])
        }
      }
      setIsLoading(false)
      setIsLoadingMore(false)
    }

    fetchOrders(currentPage)

    const channel = supabase
      .channel('user-orders')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `user_id=eq.${user.id}`,
      }, () => { fetchOrders(currentPage) })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, authLoading, currentPage])

  const totalPages = Math.ceil(totalOrders / ORDERS_PER_PAGE)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!user) return null

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-luxury-gold/30 border-t-luxury-gold" />
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'text-green-600 bg-green-50'
      case 'shipped': return 'text-blue-600 bg-blue-50'
      case 'packed': return 'text-purple-600 bg-purple-50'
      case 'processing': return 'text-yellow-600 bg-yellow-50'
      case 'cancelled': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending_payment: t.trackOrder.statuses.pending_payment,
      processing: t.trackOrder.statuses.processing,
      packed: t.trackOrder.statuses.packed,
      shipped: t.trackOrder.statuses.shipped,
      delivered: t.trackOrder.statuses.delivered,
      cancelled: t.trackOrder.statuses.cancelled,
      refunded: t.trackOrder.statuses.refunded,
    }
    return labels[status] || status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-border/40 p-12 text-center">
        <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
        <h3 className="font-montserrat text-2xl font-bold mb-2">{t.account.noOrdersYet}</h3>
        <p className="text-muted-foreground mb-6">{t.account.startShopping}</p>
        <Link href="/products" className="inline-block rounded-md bg-luxury-gold px-6 py-3 text-white hover:bg-luxury-gold/90 transition-colors">
          {t.account.browseProducts}
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {isLoadingMore && (
        <div className="flex items-center justify-center py-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-luxury-gold/30 border-t-luxury-gold" />
        </div>
      )}
      {orders.map((order) => {
        const firstItem = order.order_items?.[0]
        const firstProduct = firstItem?.product
        const totalItems = order.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0
        const extraCount = order.order_items.length - 1

        return (
          <Link
            key={order.id}
            href={`/account/orders/${order.id}`}
            className="group block rounded-lg border border-border/40 hover:border-luxury-gold hover:bg-luxury-gold/5 hover:shadow-md transition-all overflow-hidden cursor-pointer"
          >
            <div className="flex gap-3 p-3 sm:gap-4 sm:p-4">
              {firstProduct && (
                <div className="flex-shrink-0 relative w-16 h-16 sm:w-20 sm:h-20">
                  {(() => {
                    // Parse image field that may be a JSON string, array, or plain string
                    const parseImg = (raw: any): string | null => {
                      if (!raw) return null
                      if (Array.isArray(raw)) return raw.filter(Boolean)[0] || null
                      if (typeof raw === 'string') {
                        try { const p = JSON.parse(raw); return Array.isArray(p) ? p.filter(Boolean)[0] || null : raw } catch { return raw }
                      }
                      return null
                    }

                    // Prefer variant-specific image
                    let displayImage: string | null = null
                    if (firstItem?.variant_name && firstProduct.variants) {
                      const variant = firstProduct.variants.find((v: any) => v.name === firstItem.variant_name)
                      if (variant?.image_url) displayImage = parseImg(variant.image_url)
                    }
                    // Fallback to product images
                    if (!displayImage) {
                      const raw = firstProduct.image_urls
                      const urls: string[] = Array.isArray(raw) ? raw : (() => { try { return JSON.parse(raw as any) } catch { return [] } })()
                      displayImage = urls.find(u => u && !u.includes('placehold.co')) || null
                    }
                    // Fallback to any variant image
                    if (!displayImage && firstProduct.variants) {
                      for (const v of firstProduct.variants) {
                        const img = parseImg((v as any).image_url)
                        if (img) { displayImage = img; break }
                      }
                    }
                    
                    return displayImage ? (
                      <Image
                        src={displayImage}
                        alt={firstItem?.variant_name || firstProduct.name}
                        fill
                        sizes="(max-width: 640px) 64px, 80px"
                        className="object-contain rounded-lg bg-gray-50 p-1"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                        <Package className="h-8 w-8 text-gray-400" />
                      </div>
                    )
                  })()}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-montserrat font-semibold text-sm sm:text-base mb-0.5">{order.order_number}</h3>
                    {firstProduct && (
                      <p className="text-xs sm:text-sm text-gray-700 mb-1 line-clamp-2">
                        {firstProduct.name}
                        {firstItem?.variant_name && (
                          <span className="text-gray-500 ml-1">({firstItem.variant_name})</span>
                        )}
                        {extraCount > 0 && (
                          <span className="text-muted-foreground ml-1">+{extraCount} more</span>
                        )}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })} · {totalItems} {totalItems === 1 ? t.account.item : t.account.items}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-luxury-gold flex-shrink-0 mt-0.5 group-hover:translate-x-1 transition-transform" />
                </div>

                <div className="flex items-center justify-between gap-2 mt-2">
                  <span className={cn('px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs font-medium whitespace-nowrap', 
                    (order as any).payment_status === 'pending' && (order as any).expiry_time && new Date((order as any).expiry_time) < new Date()
                      ? 'bg-red-100 text-red-700'
                      : getStatusColor(order.status)
                  )}>
                    {(order as any).payment_status === 'pending' && (order as any).expiry_time && new Date((order as any).expiry_time) < new Date()
                      ? t.account.expired
                      : getStatusLabel(order.status)
                    }
                  </span>
                  <span className="font-semibold text-xs sm:text-sm whitespace-nowrap">
                    {(() => {
                      const computedTotal = (order.subtotal_amount ?? 0) - (order.discount_amount ?? 0) + (order.shipping_amount ?? 0) + (order.tax_amount ?? 0)
                      return order.currency_code === 'IDR'
                        ? `Rp. ${computedTotal.toLocaleString('id-ID')}`
                        : order.currency_code === 'USD'
                        ? `$${computedTotal.toFixed(2)}`
                        : `${order.currency_code} ${computedTotal.toFixed(2)}`
                    })()}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        )
      })}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6 pb-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-2 rounded-md border border-border/40 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-luxury-gray-light transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="text-sm hidden sm:inline">{t.common?.previous || 'Previous'}</span>
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                // Show first, last, current, and adjacent pages
                return page === 1 || 
                       page === totalPages || 
                       Math.abs(page - currentPage) <= 1
              })
              .map((page, idx, arr) => {
                // Add ellipsis
                const prevPage = arr[idx - 1]
                const showEllipsis = prevPage && page - prevPage > 1
                
                return (
                  <div key={page} className="flex items-center gap-1">
                    {showEllipsis && <span className="px-2 text-gray-400">...</span>}
                    <button
                      onClick={() => handlePageChange(page)}
                      className={cn(
                        'w-8 h-8 sm:w-10 sm:h-10 rounded-md text-sm font-medium transition-colors',
                        page === currentPage
                          ? 'bg-luxury-gold text-white'
                          : 'border border-border/40 hover:bg-luxury-gray-light'
                      )}
                    >
                      {page}
                    </button>
                  </div>
                )
              })}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-3 py-2 rounded-md border border-border/40 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-luxury-gray-light transition-colors"
          >
            <span className="text-sm hidden sm:inline">{t.common?.next || 'Next'}</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Page info */}
      {totalOrders > 0 && (
        <p className="text-center text-sm text-muted-foreground pb-4">
          {t.common?.showing || 'Showing'} {((currentPage - 1) * ORDERS_PER_PAGE) + 1}-{Math.min(currentPage * ORDERS_PER_PAGE, totalOrders)} {t.common?.of || 'of'} {totalOrders} {totalOrders === 1 ? t.account.order || 'order' : t.account.orders || 'orders'}
        </p>
      )}
    </div>
  )
}
