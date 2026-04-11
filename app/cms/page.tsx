'use client'

import { useUserRole } from '@/hooks/useUserRole'
import { Package, ShoppingCart, Users, TrendingUp, DollarSign, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export default function CMSPage() {
  const { role } = useUserRole()
  const [stats, setStats] = useState<Array<{ name: string; value: string; icon: any; href: string; change: string | null }>>([
    { name: 'Total Products', value: '-', icon: Package, href: '/cms/products', change: null },
    { name: 'Total Orders', value: '-', icon: ShoppingCart, href: '/cms/orders', change: null },
    { name: 'Total Customers', value: '-', icon: Users, href: '/cms/customers', change: null },
    { name: 'Total Revenue', value: '-', icon: DollarSign, href: '#', change: null },
  ])
  const [orderStats, setOrderStats] = useState({
    pending_payment: 0,
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0
  })
  const [lowStockCount, setLowStockCount] = useState(0)
  const [period, setPeriod] = useState('30d')
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [recentOrders, setRecentOrders] = useState<any[]>([])

  useEffect(() => {
    fetchStats()
    fetchAnalytics()
    fetchTopProducts()
    fetchRecentOrders()
  }, [])

  useEffect(() => {
    fetchAnalytics()
  }, [period])

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/reports/sales?period=${period}`)
      if (response.ok) {
        const data = await response.json()
        setAnalyticsData(data)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    }
  }

  const fetchTopProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price_usd, products_sold, stock_quantity')
        .eq('is_active', true)
        .order('products_sold', { ascending: false, nullsFirst: false })
        .limit(5)
      
      if (data) {
        setTopProducts(data)
      }
    } catch (error) {
      console.error('Error fetching top products:', error)
    }
  }

  const fetchRecentOrders = async () => {
    try {
      // Fetch recent orders from database
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, total_amount, status, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(3)
      
      if (data) {
        setRecentOrders(data)
      }
    } catch (error) {
      console.error('Error fetching recent orders:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
      
      const { count: totalOrdersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
      
      const { count: usersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .neq('role', 'admin')
      
      const { data: ordersData } = await supabase
        .from('orders')
        .select('total_amount, status')
      
      let totalRevenue = 0
      const statusCounts = {
        pending_payment: 0,
        pending: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0
      }
      
      if (ordersData) {
        ordersData.forEach(order => {
          totalRevenue += order.total_amount || 0
          if (statusCounts.hasOwnProperty(order.status)) {
            statusCounts[order.status as keyof typeof statusCounts]++
          }
        })
      }
      
      setOrderStats(statusCounts)
      
      const { count: lowStock } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .lte('stock_quantity', 10)
        .eq('is_active', true)
      
      setLowStockCount(lowStock || 0)
      
      setStats([
        { name: 'Total Products', value: productsCount?.toString() || '0', icon: Package, href: '/cms/products', change: lowStock ? `${lowStock} low stock` : null },
        { name: 'Total Orders', value: totalOrdersCount?.toString() || '0', icon: ShoppingCart, href: '/cms/orders', change: statusCounts.pending ? `${statusCounts.pending} pending` : null },
        { name: 'Total Customers', value: usersCount?.toString() || '0', icon: Users, href: '/cms/customers', change: null },
        { name: 'Total Revenue', value: `Rp${totalRevenue.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, icon: DollarSign, href: '#', change: null },
      ])
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const quickActions = [
    { name: 'Add New Product', href: '/cms/products/new', color: 'bg-blue-600' },
    { name: 'Create Promo Code', href: '/cms/promo-codes/new', color: 'bg-green-600' },
    { name: 'Manage Banners', href: '/cms/banners', color: 'bg-purple-600' },
    { name: 'View Orders', href: '/cms/orders', color: 'bg-orange-600' },
  ]

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-xs sm:text-sm text-gray-600">Welcome to your CMS dashboard</p>
      </div>

      <div className="grid gap-3 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
        </select>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            href={stat.href}
            className="rounded-lg bg-white p-4 sm:p-6 shadow-sm ring-1 ring-gray-200 transition-all hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-semibold text-gray-900">{stat.value}</p>
                {stat.change && (
                  <p className="mt-1 text-xs text-gray-500">{stat.change}</p>
                )}
              </div>
              <div className="rounded-full bg-luxury-gold/10 p-2 sm:p-3">
                <stat.icon className="h-5 w-5 sm:h-6 sm:w-6 text-luxury-gold" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="rounded-lg bg-white p-4 sm:p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Quick Actions</h2>
        <div className="mt-3 sm:mt-4 grid gap-2 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link key={action.name} href={action.href}>
              <Button
                className={cn(
                  'w-full',
                  action.color,
                  'text-white hover:opacity-90'
                )}
              >
                {action.name}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-4 sm:p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Top Selling Products</h2>
          <div className="mt-4 space-y-4">
            {topProducts.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No products found</p>
            ) : (
              topProducts.map((product, index) => (
                <div key={product.id} className={`flex items-center justify-between ${index < topProducts.length - 1 ? 'border-b border-gray-100 pb-3 sm:pb-4' : ''}`}>
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{product.name}</p>
                    <p className="text-xs sm:text-sm text-gray-500">{product.products_sold || 0} sold · Stock: {product.stock_quantity || 0}</p>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm sm:text-base whitespace-nowrap">${product.price_usd}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 sm:p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Recent Orders</h2>
          <div className="mt-4 space-y-4">
            {recentOrders.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No orders found</p>
            ) : (
              recentOrders.map((order, index) => {
                const getStatusColor = (status: string) => {
                  switch (status) {
                    case 'completed': return 'bg-green-100 text-green-800'
                    case 'processing': return 'bg-blue-100 text-blue-800'
                    case 'pending': return 'bg-yellow-100 text-yellow-800'
                    case 'shipped': return 'bg-purple-100 text-purple-800'
                    default: return 'bg-gray-100 text-gray-800'
                  }
                }
                
                return (
                  <div key={order.id} className={`flex items-center justify-between ${index < recentOrders.length - 1 ? 'border-b border-gray-100 pb-4' : ''}`}>
                    <div>
                      <p className="font-medium text-gray-900">#{order.order_number}</p>
                      <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">Rp{order.total_amount.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-4 sm:p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Order Status Breakdown</h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <span className="text-sm text-gray-600">Pending Payment</span>
              </div>
              <span className="font-semibold text-gray-900">{orderStats.pending_payment}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-gray-600">Pending</span>
              </div>
              <span className="font-semibold text-gray-900">{orderStats.pending}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-gray-600">Processing</span>
              </div>
              <span className="font-semibold text-gray-900">{orderStats.processing}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <span className="text-sm text-gray-600">Shipped</span>
              </div>
              <span className="font-semibold text-gray-900">{orderStats.shipped}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-gray-600">Delivered</span>
              </div>
              <span className="font-semibold text-gray-900">{orderStats.delivered}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-gray-600">Cancelled</span>
              </div>
              <span className="font-semibold text-gray-900">{orderStats.cancelled}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Inventory Alerts</h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-yellow-50 p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-gray-900">Low Stock Items</p>
                  <p className="text-sm text-gray-600">{lowStockCount} products need restocking</p>
                </div>
              </div>
              <Link href="/cms/products">
                <Button variant="outline" size="sm">View</Button>
              </Link>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Website Status</span>
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                  Online
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}
