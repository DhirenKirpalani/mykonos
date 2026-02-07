'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/database.types'
import { Package, ChevronDown, ChevronUp, Download, Truck } from 'lucide-react'
import { toast } from 'sonner'

type Order = Database['public']['Tables']['orders']['Row']
type OrderItem = Database['public']['Tables']['order_items']['Row'] & {
  product: Database['public']['Tables']['products']['Row']
}

interface OrderWithItems extends Order {
  order_items: OrderItem[]
}

interface OrderHistoryProps {
  userId: string
}

export function OrderHistory({ userId }: OrderHistoryProps) {
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchOrders()
  }, [userId])

  const fetchOrders = async () => {
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError

      if (ordersData) {
        const ordersWithItems = await Promise.all(
          ordersData.map(async (order) => {
            const typedOrder = order as Order
            const { data: items, error: itemsError } = await supabase
              .from('order_items')
              .select(`
                *,
                product:products(*)
              `)
              .eq('order_id', typedOrder.id) as { data: any[] | null; error: any }

            if (itemsError) throw itemsError

            return {
              ...typedOrder,
              order_items: items || [],
            } as OrderWithItems
          })
        )

        setOrders(ordersWithItems)
      }
    } catch (error: any) {
      toast.error('Failed to load orders', {
        description: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleOrderExpansion = (orderId: string) => {
    const newExpanded = new Set(expandedOrders)
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId)
    } else {
      newExpanded.add(orderId)
    }
    setExpandedOrders(newExpanded)
  }

  const handleDownloadInvoice = async (orderId: string) => {
    toast.info('Invoice download', {
      description: 'Invoice generation feature coming soon.',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'shipped':
        return 'bg-purple-100 text-purple-800'
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'shipped':
      case 'delivered':
        return <Truck className="h-4 w-4" />
      default:
        return <Package className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-luxury-gold border-t-transparent"></div>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-border/40 bg-luxury-gray-light p-12 text-center">
        <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-2 font-serif text-xl font-bold">No Orders Yet</h3>
        <p className="text-sm text-muted-foreground">
          When you place orders, they will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const isExpanded = expandedOrders.has(order.id)
        const orderDate = new Date(order.created_at || Date.now()).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })

        return (
          <div
            key={order.id}
            className="rounded-lg border border-border/40 bg-white overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <h3 className="font-medium">Order #{order.id.slice(0, 8).toUpperCase()}</h3>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {getStatusIcon(order.status)}
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Placed on {orderDate}</p>
                  <p className="mt-1 font-serif text-lg font-bold text-luxury-gold">
                    ${order.total_amount.toFixed(2)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownloadInvoice(order.id)}
                    className="rounded-md border border-border/40 p-2 text-muted-foreground transition-colors hover:bg-luxury-gray-light"
                    title="Download Invoice"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => toggleOrderExpansion(order.id)}
                    className="rounded-md border border-border/40 p-2 text-muted-foreground transition-colors hover:bg-luxury-gray-light"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-border/40 bg-luxury-gray-light p-6">
                <h4 className="mb-4 font-medium">Order Items</h4>
                <div className="space-y-3">
                  {order.order_items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 rounded-lg bg-white p-4"
                    >
                      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-luxury-gray-light">
                        {item.product.image_urls && item.product.image_urls[0] && (
                          <img
                            src={item.product.image_urls[0]}
                            alt={item.product.name}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        <h5 className="font-medium">{item.product.name}</h5>
                        <p className="text-sm text-muted-foreground">
                          Quantity: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${item.price_at_purchase.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">
                          ${(item.price_at_purchase * item.quantity).toFixed(2)} total
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-lg bg-white p-4">
                  <h4 className="mb-2 font-medium">Shipping Address</h4>
                  <div className="text-sm text-muted-foreground">
                    {typeof order.shipping_address === 'object' && order.shipping_address !== null ? (
                      <>
                        <p>{(order.shipping_address as any).full_name}</p>
                        <p>{(order.shipping_address as any).address_line1}</p>
                        {(order.shipping_address as any).address_line2 && (
                          <p>{(order.shipping_address as any).address_line2}</p>
                        )}
                        <p>
                          {(order.shipping_address as any).city},{' '}
                          {(order.shipping_address as any).state_province}{' '}
                          {(order.shipping_address as any).postal_code}
                        </p>
                        <p>{(order.shipping_address as any).country}</p>
                      </>
                    ) : (
                      <p>No shipping address available</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
