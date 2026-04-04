'use client'

import { useState, useEffect } from 'react'
import { Search, Package, Truck, CheckCircle, Clock, ChevronDown, ChevronRight, MapPin, User, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AuditLogModal } from '@/components/AuditLogModal'
import { toast } from 'sonner'

interface Order {
  id: string
  order_number: string
  user_id: string
  status: string
  total_amount: number
  created_at: string
  updated_at: string
  customer_name?: string
  customer_email?: string
  shipping_address?: any
  payment_status?: string
  first_product_name?: string
  items_count?: number
  user?: {
    first_name: string
    last_name: string
    email: string
  }
}

interface OrderItem {
  id: string
  product_name: string
  variant_name?: string
  quantity: number
  price: number
  image_url?: string
}

interface OrderDetails {
  order: Order
  items: OrderItem[]
  discount?: {
    amount: number
    type: string
  } | null
  voucher?: {
    amount: number
    code: string
  } | null
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [auditLogOpen, setAuditLogOpen] = useState(false)
  const [auditOrder, setAuditOrder] = useState<Order | null>(null)
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const [orderDetails, setOrderDetails] = useState<Map<string, OrderDetails>>(new Map())
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [ordersPerPage] = useState(10)

  useEffect(() => {
    // Reset page to 1 when status filter changes
    setCurrentPage(1)
    // Clear order details cache
    setOrderDetails(new Map())
    // Clear selected orders
    setSelectedOrders(new Set())
    // Fetch new orders
    fetchOrders()
  }, [statusFilter])

  // Fetch all orders once for status counts
  useEffect(() => {
    fetchAllOrders()
  }, [])

  const fetchAllOrders = async () => {
    try {
      const response = await fetch('/api/orders/admin')
      if (response.ok) {
        const data = await response.json()
        setAllOrders(data)
      }
    } catch (error) {
      console.error('Error fetching all orders:', error)
    }
  }

  const fetchOrders = async () => {
    console.log('🔄 [ORDERS] Starting to fetch orders...')
    console.log('🔍 [ORDERS] Status filter:', statusFilter)
    setLoading(true)
    try {
      const url = statusFilter === 'all' 
        ? '/api/orders/admin'
        : `/api/orders/admin?status=${statusFilter}`
      
      console.log('📡 [ORDERS] Fetching from URL:', url)
      const response = await fetch(url)
      console.log('📥 [ORDERS] Response status:', response.status, response.statusText)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ [ORDERS] Data received:', {
          count: data?.length || 0,
          sample: data?.[0] || null,
          allData: data
        })
        setOrders(data)
        
        // Clear order details when fetching new orders
        setOrderDetails(new Map())
      } else {
        const errorText = await response.text()
        console.error('❌ [ORDERS] Failed to fetch orders:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        })
        toast.error(`Failed to fetch orders: ${response.statusText}`)
      }
    } catch (error) {
      console.error('💥 [ORDERS] Exception while fetching orders:', error)
      toast.error('An error occurred while fetching orders')
    } finally {
      setLoading(false)
      console.log('🏁 [ORDERS] Fetch complete, loading set to false')
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

  const bulkUpdateStatus = async (newStatus: string) => {
    if (selectedOrders.size === 0) return
    
    // Validate: Can only ship orders that are packed
    if (newStatus === 'shipped') {
      const selectedOrdersData = orders.filter(o => selectedOrders.has(o.id))
      const nonPackedOrders = selectedOrdersData.filter(o => o.status !== 'packed')
      
      if (nonPackedOrders.length > 0) {
        toast.error(`Cannot ship orders that are not packed. ${nonPackedOrders.length} order(s) must be marked as packed first.`)
        return
      }
    }
    
    setBulkActionLoading(true)
    try {
      const promises = Array.from(selectedOrders).map(orderId =>
        fetch(`/api/orders/${orderId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        })
      )
      
      const results = await Promise.all(promises)
      const failed = results.filter(r => !r.ok)
      
      if (failed.length > 0) {
        toast.error(`Failed to update ${failed.length} order(s). Please check server logs.`)
      } else {
        toast.success(`Successfully updated ${selectedOrders.size} order(s) to ${newStatus}`)
      }
      
      setSelectedOrders(new Set())
      fetchOrders()
    } catch (error) {
      console.error('Error bulk updating orders:', error)
      toast.error('An error occurred while updating orders')
    } finally {
      setBulkActionLoading(false)
    }
  }

  const toggleOrderSelection = (orderId: string) => {
    const newSelected = new Set(selectedOrders)
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId)
    } else {
      newSelected.add(orderId)
    }
    setSelectedOrders(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedOrders.size === allSelectableOrders.length) {
      setSelectedOrders(new Set())
    } else {
      setSelectedOrders(new Set(allSelectableOrders.map(o => o.id)))
    }
  }

  const toggleExpandOrder = async (orderId: string) => {
    const newExpanded = new Set(expandedOrders)
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId)
    } else {
      newExpanded.add(orderId)
      // Fetch order details if not already loaded
      if (!orderDetails.has(orderId)) {
        await fetchOrderDetails(orderId)
      }
    }
    setExpandedOrders(newExpanded)
  }

  const fetchOrderDetails = async (orderId: string) => {
    console.log('🔄 [ORDER DETAILS] Fetching details for order:', orderId)
    setLoadingDetails(prev => new Set(prev).add(orderId))
    try {
      const url = `/api/orders/${orderId}/details`
      console.log('📡 [ORDER DETAILS] Fetching from URL:', url)
      const response = await fetch(url)
      console.log('📥 [ORDER DETAILS] Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ [ORDER DETAILS] Data received:', {
          orderId,
          itemsCount: data?.items?.length || 0,
          data
        })
        setOrderDetails(prev => new Map(prev).set(orderId, data))
      } else {
        const errorText = await response.text()
        console.error('❌ [ORDER DETAILS] Failed:', {
          orderId,
          status: response.status,
          error: errorText
        })
        toast.error('Failed to load order details')
      }
    } catch (error) {
      console.error('💥 [ORDER DETAILS] Exception:', { orderId, error })
      toast.error('Failed to load order details')
    } finally {
      setLoadingDetails(prev => {
        const newSet = new Set(prev)
        newSet.delete(orderId)
        return newSet
      })
      console.log('🏁 [ORDER DETAILS] Fetch complete for order:', orderId)
    }
  }

  const markAsPacked = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'packed' }),
      })
      if (response.ok) {
        toast.success('Order marked as packed')
        fetchOrders()
      }
    } catch (error) {
      console.error('Error marking order as packed:', error)
      toast.error('Failed to update order')
    }
  }

  const fulfillOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'shipped' }),
      })
      if (response.ok) {
        toast.success('Order fulfilled and marked as shipped')
        fetchOrders()
      }
    } catch (error) {
      console.error('Error fulfilling order:', error)
      toast.error('Failed to fulfill order')
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending_payment: 'bg-orange-100 text-orange-800',
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      packed: 'bg-purple-100 text-purple-800',
      shipped: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending_payment: 'Pending Payment',
      pending: 'Pending',
      processing: 'Processing',
      packed: 'Packed',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    }
    return labels[status] || status
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
    const query = searchQuery.toLowerCase()
    const details = orderDetails.get(order.id)
    const productNames = details?.items?.map(item => item.product_name.toLowerCase()).join(' ') || ''
    
    return order.order_number.toLowerCase().includes(query) ||
      (order.customer_name?.toLowerCase().includes(query)) ||
      (order.customer_email?.toLowerCase().includes(query)) ||
      (order.user?.email?.toLowerCase().includes(query)) ||
      productNames.includes(query)
  })

  // Get all processing and packed orders across all pages for bulk selection
  const allProcessingOrders = filteredOrders.filter(order => order.status === 'processing')
  const allPackedOrders = filteredOrders.filter(order => order.status === 'packed')
  const allSelectableOrders = filteredOrders.filter(order => order.status === 'processing' || order.status === 'packed')

  // Count orders by status from ALL orders, not filtered
  const statusCounts = {
    all: allOrders.length,
    pending_payment: allOrders.filter(o => o.status === 'pending_payment').length,
    pending: allOrders.filter(o => o.status === 'pending').length,
    processing: allOrders.filter(o => o.status === 'processing').length,
    packed: allOrders.filter(o => o.status === 'packed').length,
    shipped: allOrders.filter(o => o.status === 'shipped').length,
    delivered: allOrders.filter(o => o.status === 'delivered').length,
    cancelled: allOrders.filter(o => o.status === 'cancelled').length,
  }

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage)
  const startIndex = (currentPage - 1) * ordersPerPage
  const endIndex = startIndex + ordersPerPage
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex)

  const processingOrders = paginatedOrders.filter(order => order.status === 'processing')
  const packedOrders = paginatedOrders.filter(order => order.status === 'packed')
  const selectableOrders = paginatedOrders.filter(order => order.status === 'processing' || order.status === 'packed')

  // Fetch details for paginated orders
  useEffect(() => {
    if (!loading && paginatedOrders.length > 0) {
      paginatedOrders.forEach(order => {
        if (!orderDetails.has(order.id) && !loadingDetails.has(order.id)) {
          fetchOrderDetails(order.id)
        }
      })
    }
  }, [paginatedOrders.map(o => o.id).join(','), loading])

  const SkeletonRows = () => (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="py-4"><div className="h-4 w-28 rounded bg-gray-200" /></td>
          <td className="py-4">
            <div className="space-y-1.5">
              <div className="h-4 w-32 rounded bg-gray-200" />
              <div className="h-3 w-40 rounded bg-gray-100" />
            </div>
          </td>
          <td className="py-4"><div className="h-4 w-20 rounded bg-gray-200" /></td>
          <td className="py-4"><div className="h-4 w-16 rounded bg-gray-200" /></td>
          <td className="py-4"><div className="h-6 w-24 rounded-full bg-gray-200" /></td>
          <td className="py-4"><div className="h-6 w-6 rounded bg-gray-200" /></td>
          <td className="py-4"><div className="h-7 w-7 rounded bg-gray-200" /></td>
        </tr>
      ))}
    </>
  )

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Orders</h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">Manage and fulfill customer orders</p>
      </div>

      <div className="rounded-lg bg-white p-4 sm:p-6 shadow-sm ring-1 ring-gray-200">
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 sm:h-5 sm:w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order ID, customer, email, or product name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 sm:pl-10 pr-4 text-sm sm:text-base focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 sm:px-4 py-2 text-sm sm:text-base focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
          >
            <option value="all">All Status</option>
            <option value="pending_payment">Pending Payment</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="packed">Packed</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Status Count Badges */}
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            disabled={loading}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              statusFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5">{statusCounts.all}</span>
          </button>
          <button
            onClick={() => setStatusFilter('pending_payment')}
            disabled={loading}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              statusFilter === 'pending_payment' ? 'bg-orange-600 text-white' : 'bg-orange-100 text-orange-800 hover:bg-orange-200'
            }`}
          >
            Pending Payment <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5">{statusCounts.pending_payment}</span>
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            disabled={loading}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              statusFilter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
            }`}
          >
            Pending <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5">{statusCounts.pending}</span>
          </button>
          <button
            onClick={() => setStatusFilter('processing')}
            disabled={loading}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              statusFilter === 'processing' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
            }`}
          >
            Processing <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5">{statusCounts.processing}</span>
          </button>
          <button
            onClick={() => setStatusFilter('packed')}
            disabled={loading}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              statusFilter === 'packed' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
            }`}
          >
            Packed <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5">{statusCounts.packed}</span>
          </button>
          <button
            onClick={() => setStatusFilter('shipped')}
            disabled={loading}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              statusFilter === 'shipped' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
            }`}
          >
            Shipped <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5">{statusCounts.shipped}</span>
          </button>
          <button
            onClick={() => setStatusFilter('delivered')}
            disabled={loading}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              statusFilter === 'delivered' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800 hover:bg-green-200'
            }`}
          >
            Delivered <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5">{statusCounts.delivered}</span>
          </button>
          <button
            onClick={() => setStatusFilter('cancelled')}
            disabled={loading}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              statusFilter === 'cancelled' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-800 hover:bg-red-200'
            }`}
          >
            Cancelled <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5">{statusCounts.cancelled}</span>
          </button>
        </div>

        {/* Bulk Actions */}
        {selectedOrders.size > 0 && (() => {
          const selectedOrdersData = orders.filter(o => selectedOrders.has(o.id))
          const allPacked = selectedOrdersData.every(o => o.status === 'packed')
          const hasProcessing = selectedOrdersData.some(o => o.status === 'processing')
          
          return (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">
                {selectedOrders.size} order{selectedOrders.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button
                  onClick={() => bulkUpdateStatus('packed')}
                  disabled={bulkActionLoading || !hasProcessing}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!hasProcessing ? 'No processing orders selected' : 'Mark selected orders as packed'}
                >
                  <Package className="h-4 w-4 mr-1" />
                  Mark as Packed
                </Button>
                <Button
                  onClick={() => bulkUpdateStatus('shipped')}
                  disabled={bulkActionLoading || !allPacked}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!allPacked ? 'All orders must be packed before shipping' : 'Mark selected orders as shipped'}
                >
                  <Truck className="h-4 w-4 mr-1" />
                  Mark as Shipped
                </Button>
              </div>
            </div>
          )
        })()}

        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs sm:text-sm font-medium text-gray-500">
                  <th className="pb-2 sm:pb-3 pl-4 sm:pl-0 whitespace-nowrap">
                    {allSelectableOrders.length > 0 && (
                      <input
                        type="checkbox"
                        checked={selectedOrders.size === allSelectableOrders.length && allSelectableOrders.length > 0}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-gray-300 text-luxury-gold focus:ring-luxury-gold"
                      />
                    )}
                  </th>
                  <th className="pb-2 sm:pb-3 whitespace-nowrap">Order ID</th>
                  <th className="pb-2 sm:pb-3 whitespace-nowrap">Product Name</th>
                  <th className="pb-2 sm:pb-3 whitespace-nowrap">Customer</th>
                  <th className="pb-2 sm:pb-3 whitespace-nowrap">Created At</th>
                  <th className="pb-2 sm:pb-3 whitespace-nowrap">Updated At</th>
                  <th className="pb-2 sm:pb-3 whitespace-nowrap">Total</th>
                  <th className="pb-2 sm:pb-3 whitespace-nowrap">Status</th>
                  <th className="pb-2 sm:pb-3 whitespace-nowrap">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? <SkeletonRows /> : paginatedOrders.map((order) => {
                  const isProcessing = order.status === 'processing'
                  const isSelected = selectedOrders.has(order.id)
                  const isExpanded = expandedOrders.has(order.id)
                  const details = orderDetails.get(order.id)
                  const isLoadingDetails = loadingDetails.has(order.id)
                  
                  return (
                  <>
                  <tr key={order.id} className="text-xs sm:text-sm hover:bg-gray-50">
                    <td className="py-3 sm:py-4 pl-4 sm:pl-0">
                      <div className="flex items-center gap-2">
                        {(order.status === 'processing' || order.status === 'packed') && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOrderSelection(order.id)}
                            className="h-4 w-4 rounded border-gray-300 text-luxury-gold focus:ring-luxury-gold"
                          />
                        )}
                        <button
                          onClick={() => toggleExpandOrder(order.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 sm:py-4">
                      <div className="font-medium text-gray-900 whitespace-nowrap">{order.order_number}</div>
                    </td>
                    <td className="py-3 sm:py-4">
                      <div className="text-gray-900 text-sm max-w-[200px] truncate">
                        {order.first_product_name || 'N/A'}
                        {order.items_count && order.items_count > 1 && (
                          <span className="text-gray-500 ml-1">+{order.items_count - 1} more</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 sm:py-4">
                      <div className="text-gray-900 max-w-[150px] sm:max-w-none truncate">
                        {order.customer_name || `${order.user?.first_name || ''} ${order.user?.last_name || ''}`.trim() || 'N/A'}
                      </div>
                      <div className="text-gray-500 text-xs max-w-[150px] sm:max-w-none truncate">{order.customer_email || order.user?.email || 'N/A'}</div>
                    </td>
                    <td className="py-3 sm:py-4 text-gray-600 whitespace-nowrap">
                      {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-3 sm:py-4 text-gray-600 whitespace-nowrap">
                      {new Date(order.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-3 sm:py-4 font-medium text-gray-900 whitespace-nowrap">
                      Rp{order.total_amount.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 sm:py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 sm:py-1 text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      {getStatusLabel(order.status)}
                    </span>
                    </td>
                    <td className="py-3 sm:py-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAuditOrder(order)
                          setAuditLogOpen(true)
                        }}
                        className="text-luxury-gold hover:text-luxury-gold/80 h-7 w-7 sm:h-8 sm:w-8 p-0"
                      >
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${order.id}-details`} className="bg-gray-50">
                      <td colSpan={10} className="px-4 py-4">
                        {isLoadingDetails ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                          </div>
                        ) : details ? (
                          <div className="bg-white rounded-lg p-4 space-y-4">
                            {/* Summary Info */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-gray-500 mb-1">Customer</p>
                                <p className="font-medium">{order.customer_name || `${order.user?.first_name || ''} ${order.user?.last_name || ''}`.trim()}</p>
                                <p className="text-gray-600">{order.customer_email || order.user?.email}</p>
                              </div>
                              <div>
                                <p className="text-gray-500 mb-1">Shipping</p>
                                {details.order.shipping_address ? (
                                  <div className="text-sm text-gray-900">
                                    <p>{details.order.shipping_address.address_line1}</p>
                                    {details.order.shipping_address.address_line2 && (
                                      <p>{details.order.shipping_address.address_line2}</p>
                                    )}
                                    <p>{details.order.shipping_address.city}, {details.order.shipping_address.state_province} {details.order.shipping_address.postal_code}</p>
                                    <p>{details.order.shipping_address.country}</p>
                                  </div>
                                ) : (
                                  <p className="text-gray-500">No address</p>
                                )}
                              </div>
                              <div>
                                <p className="text-gray-500 mb-1">Payment</p>
                                <p className={`font-medium ${order.payment_status === 'completed' ? 'text-green-600' : 'text-orange-600'}`}>
                                  {order.payment_status || 'pending'}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500 mb-1">Discounts</p>
                                {details.discount && (
                                  <p className="text-green-600 font-medium">
                                    Discount: -Rp{details.discount.amount.toLocaleString('id-ID')}
                                  </p>
                                )}
                                {details.voucher && (
                                  <p className="text-blue-600 font-medium">
                                    Voucher ({details.voucher.code}): -Rp{details.voucher.amount.toLocaleString('id-ID')}
                                  </p>
                                )}
                                {!details.discount && !details.voucher && (
                                  <p className="text-gray-500">No discounts</p>
                                )}
                              </div>
                            </div>

                            {/* Order Items */}
                            <div>
                              <p className="text-gray-500 text-sm mb-2">Items ({details.items.length})</p>
                              <div className="space-y-2">
                                {(() => {
                                  // Group items by product name
                                  const grouped = details.items.reduce((acc: any, item) => {
                                    if (!acc[item.product_name]) {
                                      acc[item.product_name] = []
                                    }
                                    acc[item.product_name].push(item)
                                    return acc
                                  }, {})

                                  return Object.entries(grouped).map(([productName, items]: [string, any]) => {
                                    const hasVariants = items.some((i: any) => i.variant_name)
                                    
                                    if (hasVariants) {
                                      // Show product name once, then list variants
                                      return (
                                        <div key={productName} className="space-y-1">
                                          <p className="font-medium text-gray-900 text-sm">{productName}</p>
                                          {items.map((item: any) => (
                                            <div key={item.id} className="flex items-center gap-3 text-sm pl-4">
                                              {item.image_url && (
                                                <img src={item.image_url} alt={item.variant_name || productName} className="h-10 w-10 rounded object-cover" />
                                              )}
                                              <div className="flex-1">
                                                <p className="text-gray-700">{item.variant_name}</p>
                                              </div>
                                              <p className="text-gray-600">×{item.quantity}</p>
                                              <p className="font-medium">Rp{(item.price * item.quantity).toLocaleString('id-ID')}</p>
                                            </div>
                                          ))}
                                        </div>
                                      )
                                    } else {
                                      // Show product name with quantity and price
                                      return items.map((item: any) => (
                                        <div key={item.id} className="flex items-center gap-3 text-sm">
                                          {item.image_url && (
                                            <img src={item.image_url} alt={item.product_name} className="h-12 w-12 rounded object-cover" />
                                          )}
                                          <div className="flex-1">
                                            <p className="font-medium text-gray-900">{item.product_name}</p>
                                          </div>
                                          <p className="text-gray-600">×{item.quantity}</p>
                                          <p className="font-medium">Rp{(item.price * item.quantity).toLocaleString('id-ID')}</p>
                                        </div>
                                      ))
                                    }
                                  })
                                })()}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-center text-gray-500 py-4">Failed to load order details</p>
                        )}
                      </td>
                    </tr>
                  )}
                  </>
                  )
                })}
              </tbody>
            </table>
          </div>
          {!loading && filteredOrders.length === 0 && (
            <div className="py-8 sm:py-12 text-center text-sm sm:text-base text-gray-500">
              No orders found.
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && filteredOrders.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length} orders
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {totalPages <= 10 ? (
                  Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <Button
                      key={`page-${page}`}
                      onClick={() => setCurrentPage(page)}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      className="w-8"
                    >
                      {page}
                    </Button>
                  ))
                ) : (
                  <>
                    {currentPage > 3 && (
                      <>
                        <Button key="page-1" onClick={() => setCurrentPage(1)} variant="outline" size="sm" className="w-8">1</Button>
                        <span key="ellipsis-start" className="px-2">...</span>
                      </>
                    )}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = Math.max(1, Math.min(currentPage - 2 + i, totalPages - 4))
                      return (
                        <Button
                          key={`page-${page}`}
                          onClick={() => setCurrentPage(page)}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          className="w-8"
                        >
                          {page}
                        </Button>
                      )
                    })}
                    {currentPage < totalPages - 2 && (
                      <>
                        <span key="ellipsis-end" className="px-2">...</span>
                        <Button key={`page-${totalPages}`} onClick={() => setCurrentPage(totalPages)} variant="outline" size="sm" className="w-8">{totalPages}</Button>
                      </>
                    )}
                  </>
                )}
              </div>
              <Button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {auditOrder && (
        <AuditLogModal
          isOpen={auditLogOpen}
          onClose={() => setAuditLogOpen(false)}
          entityType="order"
          entityId={auditOrder.id}
          entityName={auditOrder.order_number}
        />
      )}
    </div>
  )
}
