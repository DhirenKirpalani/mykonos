'use client'

import { useState, useEffect } from 'react'
import { Search, Eye, Package, Truck, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface Order {
  id: string
  order_number: string
  user_id: string
  status: string
  total_amount: number
  created_at: string
  customer_name?: string
  customer_email?: string
  user?: {
    first_name: string
    last_name: string
    email: string
  }
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchOrders()
  }, [statusFilter])

  const fetchOrders = async () => {
    try {
      const url = statusFilter === 'all' 
        ? '/api/orders/admin'
        : `/api/orders/admin?status=${statusFilter}`
      
      console.log('Fetching orders from:', url)
      const response = await fetch(url)
      console.log('Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Orders received:', data)
        setOrders(data)
      } else {
        const errorData = await response.json()
        console.error('Failed to fetch orders:', errorData)
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (response.ok) {
        fetchOrders()
      }
    } catch (error) {
      console.error('Error updating order status:', error)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusIcon = (status: string) => {
    const icons: Record<string, any> = {
      pending: Package,
      processing: Package,
      shipped: Truck,
      delivered: CheckCircle,
    }
    const Icon = icons[status] || Package
    return <Icon className="h-4 w-4" />
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Loading orders...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
        <p className="mt-2 text-gray-600">Manage and fulfill customer orders</p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left text-sm font-medium text-gray-500">
                <th className="pb-3">Order</th>
                <th className="pb-3">Customer</th>
                <th className="pb-3">Date</th>
                <th className="pb-3">Total</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="text-sm">
                  <td className="py-4">
                    <div className="font-medium text-gray-900">{order.order_number}</div>
                  </td>
                  <td className="py-4">
                    <div className="text-gray-900">
                      {order.customer_name || `${order.user?.first_name || ''} ${order.user?.last_name || ''}`.trim() || 'N/A'}
                    </div>
                    <div className="text-gray-500">{order.customer_email || order.user?.email || 'N/A'}</div>
                  </td>
                  <td className="py-4 text-gray-600">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-4 font-medium text-gray-900">
                    ${order.total_amount.toFixed(2)}
                  </td>
                  <td className="py-4">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      {order.status}
                    </span>
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <Link href={`/cms/orders/${order.order_number}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-luxury-gold focus:outline-none"
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredOrders.length === 0 && (
            <div className="py-12 text-center text-gray-500">
              No orders found.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
