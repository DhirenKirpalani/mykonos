'use client'

import { useUserRole } from '@/hooks/useUserRole'
import { 
  Package, ShoppingCart, Users, TrendingUp, DollarSign, AlertTriangle, 
  CheckCircle, Clock, XCircle, ArrowUp, ArrowDown, Truck, CreditCard,
  ShoppingBag, BarChart3, Calendar, Eye, Star, Percent
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils/region'
import type { Region } from '@/lib/types/region'
import { getCurrencyInfo } from '@/lib/utils/currency'

interface DashboardMetrics {
  revenue: {
    total: number
    totalUSD: number
    change: number
    trend: 'up' | 'down'
  }
  orders: {
    total: number
    change: number
    trend: 'up' | 'down'
    avgValue: number
    avgValueUSD: number
  }
  customers: {
    total: number
    new: number
    returning: number
  }
  products: {
    total: number
    lowStock: number
    outOfStock: number
  }
  conversion: {
    rate: number
    visitors: number
  }
}

export default function CMSPage() {
  const { role } = useUserRole()
  const [period, setPeriod] = useState('30')
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    revenue: { total: 0, totalUSD: 0, change: 0, trend: 'up' },
    orders: { total: 0, change: 0, trend: 'up', avgValue: 0, avgValueUSD: 0 },
    customers: { total: 0, new: 0, returning: 0 },
    products: { total: 0, lowStock: 0, outOfStock: 0 },
    conversion: { rate: 0, visitors: 0 }
  })
  const [orderStats, setOrderStats] = useState({
    pending_payment: 0,
    pending: 0,
    processing: 0,
    packed: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0
  })
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [salesData, setSalesData] = useState<any[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [period])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchMetrics(),
        fetchOrderStats(),
        fetchTopProducts(),
        fetchRecentOrders(),
        fetchSalesData()
      ])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMetrics = async () => {
    try {
      const daysAgo = parseInt(period)
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - daysAgo)

      // Current period
      const { data: currentOrders } = await supabase
        .from('orders')
        .select('total_amount, created_at, status, user_id, currency_code, payment_metadata')
        .gte('created_at', startDate.toISOString())

      // Previous period for comparison
      const prevStartDate = new Date(startDate)
      prevStartDate.setDate(prevStartDate.getDate() - daysAgo)
      
      const { data: previousOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .gte('created_at', prevStartDate.toISOString())
        .lt('created_at', startDate.toISOString())

      // Calculate revenue - convert all to IDR and USD for dual currency reporting
      const convertToIDR = (amount: number, currencyCode?: string) => {
        if (!amount || isNaN(amount)) return 0
        
        // Infer currency from amount if not provided
        if (!currencyCode) {
          currencyCode = amount < 1000 ? 'USD' : 'IDR'
        }
        
        if (currencyCode === 'IDR') return amount
        if (currencyCode === 'USD') return amount * 15000 // 1 USD = 15,000 IDR
        // For other currencies, assume USD-like and convert
        return amount * 15000
      }

      const convertToUSD = (amount: number, currencyCode?: string) => {
        if (!amount || isNaN(amount)) return 0
        
        // Infer currency from amount if not provided
        if (!currencyCode) {
          currencyCode = amount < 1000 ? 'USD' : 'IDR'
        }
        
        if (currencyCode === 'USD') return amount
        if (currencyCode === 'IDR') return amount / 15000 // 15,000 IDR = 1 USD
        // For other currencies, assume USD-like
        return amount
      }

      let currentRevenueIDR = 0
      let currentRevenueUSD = 0
      
      currentOrders?.forEach(order => {
        const currencyCode = order.payment_metadata?.currency_code || order.currency_code
        const amount = order.total_amount || 0
        const idrAmount = convertToIDR(amount, currencyCode)
        const usdAmount = convertToUSD(amount, currencyCode)
        
        if (!isNaN(idrAmount)) currentRevenueIDR += idrAmount
        if (!isNaN(usdAmount)) currentRevenueUSD += usdAmount
      })
      
      const previousRevenue = previousOrders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0
      const revenueChange = previousRevenue > 0 ? ((currentRevenueIDR - previousRevenue) / previousRevenue) * 100 : 0

      // Calculate orders
      const currentOrderCount = currentOrders?.length || 0
      const previousOrderCount = previousOrders?.length || 0
      const orderChange = previousOrderCount > 0 ? ((currentOrderCount - previousOrderCount) / previousOrderCount) * 100 : 0
      const avgOrderValueIDR = currentOrderCount > 0 ? currentRevenueIDR / currentOrderCount : 0
      const avgOrderValueUSD = currentOrderCount > 0 ? currentRevenueUSD / currentOrderCount : 0

      // Get customers
      const { count: totalCustomers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .neq('role', 'admin')

      const { count: newCustomers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .neq('role', 'admin')
        .gte('created_at', startDate.toISOString())

      // Get products
      const { count: totalProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })

      const { count: lowStock } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .lte('stock_quantity', 10)
        .gt('stock_quantity', 0)
        .eq('is_active', true)

      const { count: outOfStock } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('stock_quantity', 0)
        .eq('is_active', true)

      setMetrics({
        revenue: {
          total: currentRevenueIDR,
          totalUSD: currentRevenueUSD,
          change: revenueChange,
          trend: revenueChange >= 0 ? 'up' : 'down'
        },
        orders: {
          total: currentOrderCount,
          change: orderChange,
          trend: orderChange >= 0 ? 'up' : 'down',
          avgValue: avgOrderValueIDR,
          avgValueUSD: avgOrderValueUSD
        },
        customers: {
          total: totalCustomers || 0,
          new: newCustomers || 0,
          returning: (totalCustomers || 0) - (newCustomers || 0)
        },
        products: {
          total: totalProducts || 0,
          lowStock: lowStock || 0,
          outOfStock: outOfStock || 0
        },
        conversion: {
          rate: 0, // TODO: Implement analytics tracking
          visitors: 0
        }
      })
    } catch (error) {
      console.error('Error fetching metrics:', error)
    }
  }

  const fetchOrderStats = async () => {
    try {
      const { data: orders } = await supabase
        .from('orders')
        .select('status')

      const stats = {
        pending_payment: 0,
        pending: 0,
        processing: 0,
        packed: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0
      }

      orders?.forEach(order => {
        if (stats.hasOwnProperty(order.status)) {
          stats[order.status as keyof typeof stats]++
        }
      })

      setOrderStats(stats)
    } catch (error) {
      console.error('Error fetching order stats:', error)
    }
  }

  const fetchTopProducts = async () => {
    try {
      const { data } = await supabase
        .from('products')
        .select('id, name, price_idr, products_sold, stock_quantity, image_urls')
        .eq('is_active', true)
        .order('products_sold', { ascending: false, nullsFirst: false })
        .limit(5)

      setTopProducts(data || [])
    } catch (error) {
      console.error('Error fetching top products:', error)
    }
  }

  const fetchRecentOrders = async () => {
    try {
      const { data } = await supabase
        .from('orders')
        .select('id, order_number, total_amount, status, payment_status, created_at, customer_email, currency_code, payment_metadata')
        .order('created_at', { ascending: false })
        .limit(5)

      setRecentOrders(data || [])
    } catch (error) {
      console.error('Error fetching recent orders:', error)
    }
  }

  const fetchSalesData = async () => {
    try {
      const daysAgo = parseInt(period)
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - daysAgo)

      const { data } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true })

      setSalesData(data || [])
    } catch (error) {
      console.error('Error fetching sales data:', error)
    }
  }

  // Helper to create a Region-like object from order currency data
  const getRegionFromOrder = (order: any): Region => {
    let currencyCode = order.payment_metadata?.currency_code || order.currency_code
    
    // If no currency code is set, infer from amount
    // Small amounts (< 1000) are likely USD, large amounts are likely IDR
    if (!currencyCode) {
      currencyCode = order.total_amount < 1000 ? 'USD' : 'IDR'
    }
    
    // Use shared currency mapping
    const currencyInfo = getCurrencyInfo(currencyCode)
    
    return {
      id: '',
      code: currencyCode,
      name: currencyInfo.name,
      currency_code: currencyCode,
      currency_symbol: currencyInfo.symbol,
      tax_rate: 0,
      is_active: true,
      created_at: ''
    }
  }

  const formatOrderAmount = (order: any) => {
    const region = getRegionFromOrder(order)
    const currencyCode = region.currency_code
    
    const usdRegion: Region = {
      id: '', code: 'USD', name: '', currency_code: 'USD', 
      currency_symbol: '$', tax_rate: 0, is_active: true, created_at: ''
    }
    
    const idrRegion: Region = {
      id: '', code: 'IDR', name: '', currency_code: 'IDR', 
      currency_symbol: 'Rp', tax_rate: 0, is_active: true, created_at: ''
    }
    
    // Format with currency code prefix
    const formatWithCode = (amount: number, code: string, reg: Region) => {
      const formatted = formatPrice(amount, reg)
      return `${code} ${formatted.replace(/^[^\d]+/, '')}` // Remove symbol, add code
    }
    
    // For management: show customer currency + base currencies (USD & IDR)
    if (currencyCode !== 'USD' && currencyCode !== 'IDR') {
      const exchangeRate = order.payment_metadata?.exchange_rate_to_usd
      if (exchangeRate) {
        const usdAmount = order.total_amount * exchangeRate
        // Approximate IDR conversion (1 USD ≈ 15,000 IDR)
        const idrAmount = usdAmount * 15000
        
        return (
          <div className="text-right">
            <p className="font-semibold text-gray-900">{formatWithCode(order.total_amount, currencyCode, region)}</p>
            <p className="text-xs text-gray-600">≈ {formatWithCode(usdAmount, 'USD', usdRegion)}</p>
            <p className="text-xs text-gray-500">≈ {formatWithCode(idrAmount, 'IDR', idrRegion)}</p>
          </div>
        )
      }
    }
    
    // If USD, show IDR equivalent
    if (currencyCode === 'USD') {
      const idrAmount = order.total_amount * 15000
      return (
        <div className="text-right">
          <p className="font-semibold text-gray-900">{formatWithCode(order.total_amount, 'USD', region)}</p>
          <p className="text-xs text-gray-500">≈ {formatWithCode(idrAmount, 'IDR', idrRegion)}</p>
        </div>
      )
    }
    
    // If IDR, show USD equivalent
    if (currencyCode === 'IDR') {
      const usdAmount = order.total_amount / 15000
      return (
        <div className="text-right">
          <p className="font-semibold text-gray-900">{formatWithCode(order.total_amount, 'IDR', region)}</p>
          <p className="text-xs text-gray-500">≈ {formatWithCode(usdAmount, 'USD', usdRegion)}</p>
        </div>
      )
    }
    
    return <p className="font-semibold text-gray-900">{formatWithCode(order.total_amount, currencyCode, region)}</p>
  }

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string }> = {
      pending_payment: { bg: 'bg-orange-100', text: 'text-orange-800' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      processing: { bg: 'bg-blue-100', text: 'text-blue-800' },
      packed: { bg: 'bg-purple-100', text: 'text-purple-800' },
      shipped: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
      delivered: { bg: 'bg-green-100', text: 'text-green-800' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800' }
    }
    return badges[status] || { bg: 'bg-gray-100', text: 'text-gray-800' }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">Business overview and key metrics</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last year</option>
        </select>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Revenue Card */}
        <div className="rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <DollarSign className="h-8 w-8 opacity-80" />
            <div className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
              metrics.revenue.trend === 'up' ? 'bg-green-500/20' : 'bg-red-500/20'
            }`}>
              {metrics.revenue.trend === 'up' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {formatPercent(metrics.revenue.change)}
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm opacity-90">Total Revenue</p>
            <p className="mt-1 text-3xl font-bold">{formatPrice(metrics.revenue.total, { id: '', code: 'IDR', name: '', currency_code: 'IDR', currency_symbol: 'Rp', tax_rate: 0, is_active: true, created_at: '' })}</p>
            <p className="mt-1 text-sm opacity-75">≈ {formatPrice(metrics.revenue.totalUSD, { id: '', code: 'USD', name: '', currency_code: 'USD', currency_symbol: '$', tax_rate: 0, is_active: true, created_at: '' })}</p>
            <p className="mt-2 text-xs opacity-75">vs previous period</p>
          </div>
        </div>

        {/* Orders Card */}
        <div className="rounded-lg bg-gradient-to-br from-green-500 to-green-600 p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <ShoppingCart className="h-8 w-8 opacity-80" />
            <div className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
              metrics.orders.trend === 'up' ? 'bg-green-500/20' : 'bg-red-500/20'
            }`}>
              {metrics.orders.trend === 'up' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {formatPercent(metrics.orders.change)}
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm opacity-90">Total Orders</p>
            <p className="mt-1 text-3xl font-bold">{metrics.orders.total}</p>
            <p className="mt-2 text-xs opacity-90">Avg: {formatPrice(metrics.orders.avgValue, { id: '', code: 'IDR', name: '', currency_code: 'IDR', currency_symbol: 'Rp', tax_rate: 0, is_active: true, created_at: '' })}</p>
            <p className="text-xs opacity-75">≈ {formatPrice(metrics.orders.avgValueUSD, { id: '', code: 'USD', name: '', currency_code: 'USD', currency_symbol: '$', tax_rate: 0, is_active: true, created_at: '' })}</p>
          </div>
        </div>

        {/* Customers Card */}
        <div className="rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <Users className="h-8 w-8 opacity-80" />
            <div className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
              {metrics.customers.new} new
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm opacity-90">Total Customers</p>
            <p className="mt-1 text-3xl font-bold">{metrics.customers.total}</p>
            <p className="mt-2 text-xs opacity-75">{metrics.customers.returning} returning</p>
          </div>
        </div>

        {/* Products Card */}
        <div className="rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <Package className="h-8 w-8 opacity-80" />
            {metrics.products.lowStock > 0 && (
              <div className="rounded-full bg-red-500 px-2 py-1 text-xs font-medium">
                {metrics.products.lowStock} low
              </div>
            )}
          </div>
          <div className="mt-4">
            <p className="text-sm opacity-90">Total Products</p>
            <p className="mt-1 text-3xl font-bold">{metrics.products.total}</p>
            <p className="mt-2 text-xs opacity-75">{metrics.products.outOfStock} out of stock</p>
          </div>
        </div>
      </div>

      {/* Order Status Overview */}
      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Pipeline</h2>
        <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{orderStats.pending_payment}</p>
            <p className="text-xs text-gray-600">Pending Payment</p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{orderStats.pending}</p>
            <p className="text-xs text-gray-600">Pending</p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <Package className="h-8 w-8 text-blue-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{orderStats.processing}</p>
            <p className="text-xs text-gray-600">Processing</p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
              <ShoppingBag className="h-8 w-8 text-purple-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{orderStats.packed}</p>
            <p className="text-xs text-gray-600">Packed</p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
              <Truck className="h-8 w-8 text-indigo-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{orderStats.shipped}</p>
            <p className="text-xs text-gray-600">Shipped</p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{orderStats.delivered}</p>
            <p className="text-xs text-gray-600">Delivered</p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{orderStats.cancelled}</p>
            <p className="text-xs text-gray-600">Cancelled</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/cms/products/new">
            <Button className="w-full bg-blue-600 hover:bg-blue-700">
              <Package className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </Link>
          <Link href="/cms/orders">
            <Button className="w-full bg-green-600 hover:bg-green-700">
              <ShoppingCart className="mr-2 h-4 w-4" />
              View Orders
            </Button>
          </Link>
          <Link href="/cms/promo-codes/new">
            <Button className="w-full bg-purple-600 hover:bg-purple-700">
              <Percent className="mr-2 h-4 w-4" />
              Create Promo
            </Button>
          </Link>
          <Link href="/cms/analytics">
            <Button className="w-full bg-orange-600 hover:bg-orange-700">
              <BarChart3 className="mr-2 h-4 w-4" />
              Analytics
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Products */}
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Top Selling Products</h2>
            <Link href="/cms/products" className="text-sm text-blue-600 hover:text-blue-700">
              View all →
            </Link>
          </div>
          <div className="space-y-4">
            {topProducts.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No products found</p>
            ) : (
              topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-lg font-bold text-gray-600">
                    #{index + 1}
                  </div>
                  {product.image_urls && product.image_urls[0] && (
                    <img 
                      src={product.image_urls[0]} 
                      alt={product.name}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{product.name}</p>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span>{product.products_sold || 0} sold</span>
                      <span>•</span>
                      <span className={product.stock_quantity <= 10 ? 'text-red-600 font-medium' : ''}>
                        Stock: {product.stock_quantity || 0}
                      </span>
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900 whitespace-nowrap">
                    {formatPrice(product.price_idr, { id: '', code: 'IDR', name: '', currency_code: 'IDR', currency_symbol: 'Rp', tax_rate: 0, is_active: true, created_at: '' })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Recent Orders</h2>
            <Link href="/cms/orders" className="text-sm text-blue-600 hover:text-blue-700">
              View all →
            </Link>
          </div>
          <div className="space-y-4">
            {recentOrders.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No orders found</p>
            ) : (
              recentOrders.map((order) => {
                const badge = getStatusBadge(order.status)
                return (
                  <Link 
                    key={order.id} 
                    href={`/cms/orders`}
                    className="block rounded-lg border border-gray-200 p-4 transition-all hover:border-blue-300 hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-mono font-medium text-gray-900">#{order.order_number}</p>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{order.customer_email}</span>
                      {formatOrderAmount(order)}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </Link>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {(metrics.products.lowStock > 0 || metrics.products.outOfStock > 0) && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900">Inventory Alerts</h3>
              <div className="mt-2 space-y-1 text-sm text-yellow-800">
                {metrics.products.lowStock > 0 && (
                  <p>• {metrics.products.lowStock} products are running low on stock (≤10 units)</p>
                )}
                {metrics.products.outOfStock > 0 && (
                  <p>• {metrics.products.outOfStock} products are out of stock</p>
                )}
              </div>
              <Link href="/cms/products">
                <Button variant="outline" size="sm" className="mt-3 border-yellow-600 text-yellow-700 hover:bg-yellow-100">
                  Review Inventory
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
