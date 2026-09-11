'use client'

import { useUserRole } from '@/hooks/useUserRole'
import { 
  Package, ShoppingCart, Users, TrendingUp, DollarSign, AlertTriangle, 
  CheckCircle, Clock, XCircle, ArrowUp, ArrowDown, Truck, CreditCard,
  ShoppingBag, BarChart3, Calendar, Eye, Star, Percent, Globe
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Dropdown } from '@/components/ui/dropdown'
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
  const [regionalStats, setRegionalStats] = useState<{
    byCurrency: { currency: string; orders: number; revenue: number; revenueUSD: number }[]
    byCountry: { country: string; orders: number; customers: number }[]
    totalByCurrency: { IDR: number; USD: number; other: number }
  }>({ byCurrency: [], byCountry: [], totalByCurrency: { IDR: 0, USD: 0, other: 0 } })
  const [businessStats, setBusinessStats] = useState<{
    paymentMethods: { method: string; orders: number; revenue: number }[]
    cartAbandonment: { total: number; expired: number; rate: number }
    vouchers: { used: number; totalDiscount: number; ordersWithVoucher: number }
    fulfillment: { awaiting: number; avgTimeHours: number; shipped: number; delivered: number }
    customerMetrics: { repeatCustomers: number; repeatRate: number; avgOrdersPerCustomer: number }
    cancellationRate: { cancelled: number; total: number; rate: number }
    aov: { current: number; previous: number; change: number }
    basketSize: { avgItems: number; totalItems: number; orders: number }
    taxShipping: { taxCollected: number; shippingCollected: number; avgShipping: number }
    topCustomers: { email: string; orders: number; revenue: number; lastOrder: string }[]
    peakHours: { hour: number; orders: number }[]
    revenueSplit: { newCustomers: number; returningCustomers: number; newRevenue: number; returningRevenue: number }
    inventoryTurnover: { totalSold: number; totalStock: number; turnoverRate: number; lowSellers: number }
  }>({
    paymentMethods: [],
    cartAbandonment: { total: 0, expired: 0, rate: 0 },
    vouchers: { used: 0, totalDiscount: 0, ordersWithVoucher: 0 },
    fulfillment: { awaiting: 0, avgTimeHours: 0, shipped: 0, delivered: 0 },
    customerMetrics: { repeatCustomers: 0, repeatRate: 0, avgOrdersPerCustomer: 0 },
    cancellationRate: { cancelled: 0, total: 0, rate: 0 },
    aov: { current: 0, previous: 0, change: 0 },
    basketSize: { avgItems: 0, totalItems: 0, orders: 0 },
    taxShipping: { taxCollected: 0, shippingCollected: 0, avgShipping: 0 },
    topCustomers: [],
    peakHours: [],
    revenueSplit: { newCustomers: 0, returningCustomers: 0, newRevenue: 0, returningRevenue: 0 },
    inventoryTurnover: { totalSold: 0, totalStock: 0, turnoverRate: 0, lowSellers: 0 }
  })

  useEffect(() => {
    fetchDashboardData()
  }, [period])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const daysAgo = parseInt(period)
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - daysAgo)
      const prevStartDate = new Date(startDate)
      prevStartDate.setDate(prevStartDate.getDate() - daysAgo)

      // === SINGLE FETCH: all orders for current + previous period ===
      // One query with all columns needed by every section
      const { data: allOrders } = await supabase
        .from('orders')
        .select('id, order_number, total_amount, status, payment_status, payment_method_type, payment_gateway, discount_amount, subtotal_amount, shipping_amount, tax_amount, expiry_time, created_at, packed_at, shipped_at, completed_at, customer_email, user_id, currency_code, payment_metadata, shipping_address, order_items(id, product_id, quantity)')
        .order('created_at', { ascending: false })

      // Split into current and previous period
      const currentOrders = (allOrders || []).filter(o => new Date(o.created_at) >= startDate)
      const previousOrders = (allOrders || []).filter(o => {
        const d = new Date(o.created_at)
        return d >= prevStartDate && d < startDate
      })

      // === Helpers ===
      const convertToUSD = (amount: number, currencyCode?: string) => {
        if (!amount || isNaN(amount)) return 0
        if (!currencyCode) currencyCode = amount < 1000 ? 'USD' : 'IDR'
        if (currencyCode === 'USD') return amount
        if (currencyCode === 'IDR') return amount / 15000
        return amount
      }
      const convertToIDR = (amount: number, currencyCode?: string) => {
        if (!amount || isNaN(amount)) return 0
        if (!currencyCode) currencyCode = amount < 1000 ? 'USD' : 'IDR'
        if (currencyCode === 'IDR') return amount
        if (currencyCode === 'USD') return amount * 15000
        return amount * 15000
      }
      const getCurrency = (o: any) => (o.payment_metadata as any)?.currency_code || o.currency_code || (o.total_amount < 1000 ? 'USD' : 'IDR')

      // === METRICS (was fetchMetrics) ===
      // Only count revenue from non-cancelled orders (paid/completed/pending)
      const validOrders = currentOrders.filter(o => o.status !== 'cancelled' && o.payment_status !== 'failed' && o.payment_status !== 'expired')
      let currentRevenueIDR = 0, currentRevenueUSD = 0
      validOrders.forEach(o => {
        const cc = getCurrency(o)
        currentRevenueIDR += convertToIDR(o.total_amount || 0, cc)
        currentRevenueUSD += convertToUSD(o.total_amount || 0, cc)
      })
      const prevValidOrders = previousOrders.filter(o => o.status !== 'cancelled' && o.payment_status !== 'failed' && o.payment_status !== 'expired')
      const prevRevenueIDR = prevValidOrders.reduce((sum, o) => sum + convertToIDR(o.total_amount || 0, getCurrency(o)), 0)
      const revenueChange = prevRevenueIDR > 0 ? ((currentRevenueIDR - prevRevenueIDR) / prevRevenueIDR) * 100 : 0
      const currentOrderCount = currentOrders.length
      const previousOrderCount = previousOrders.length
      const orderChange = previousOrderCount > 0 ? ((currentOrderCount - previousOrderCount) / previousOrderCount) * 100 : 0

      // Customers + products (head-only count queries — lightweight)
      const [custRes, newCustRes, prodRes, lowStockRes, outStockRes, topProdRes] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }).neq('role', 'admin'),
        supabase.from('users').select('*', { count: 'exact', head: true }).neq('role', 'admin').gte('created_at', startDate.toISOString()),
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }).lte('stock_quantity', 10).gt('stock_quantity', 0).eq('is_visible', true),
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('stock_quantity', 0).eq('is_visible', true),
        supabase.from('products').select('id, name, price_idr, stock_quantity, image_urls').eq('is_visible', true),
      ])

      setMetrics({
        revenue: { total: currentRevenueIDR, totalUSD: currentRevenueUSD, change: revenueChange, trend: revenueChange >= 0 ? 'up' : 'down' },
        orders: { total: currentOrderCount, change: orderChange, trend: orderChange >= 0 ? 'up' : 'down', avgValue: currentOrderCount > 0 ? currentRevenueIDR / currentOrderCount : 0, avgValueUSD: currentOrderCount > 0 ? currentRevenueUSD / currentOrderCount : 0 },
        customers: { total: custRes.count || 0, new: newCustRes.count || 0, returning: (custRes.count || 0) - (newCustRes.count || 0) },
        products: { total: prodRes.count || 0, lowStock: lowStockRes.count || 0, outOfStock: outStockRes.count || 0 },
        conversion: { rate: 0, visitors: 0 }
      })

      // === ORDER STATS (was fetchOrderStats) — derive from allOrders ===
      const stats = { pending_payment: 0, pending: 0, processing: 0, packed: 0, shipped: 0, delivered: 0, cancelled: 0 }
      allOrders?.forEach(o => { if (stats.hasOwnProperty(o.status)) (stats as any)[o.status]++ })
      setOrderStats(stats)

      // === TOP PRODUCTS (calculate actual sold from order_items, not marketing products_sold field) ===
      const actualSoldMap: Record<string, number> = {}
      allOrders?.forEach(o => {
        // Only count valid (non-cancelled) orders
        if (o.status === 'cancelled' || o.payment_status === 'failed' || o.payment_status === 'expired') return
        ;(o.order_items || []).forEach((item: any) => {
          if (item.product_id) actualSoldMap[item.product_id] = (actualSoldMap[item.product_id] || 0) + (item.quantity || 0)
        })
      })
      const topProductsData = (topProdRes.data || []).map((p: any) => ({
        ...p,
        actual_sold: actualSoldMap[p.id] || 0
      })).filter((p: any) => p.actual_sold > 0).sort((a: any, b: any) => b.actual_sold - a.actual_sold).slice(0, 5)
      setTopProducts(topProductsData)

      // === RECENT ORDERS (first 5 from allOrders, already sorted desc) ===
      setRecentOrders((allOrders || []).slice(0, 5))

      // === SALES DATA (current period, sorted asc) ===
      setSalesData(currentOrders.slice().reverse())

      // === REGIONAL STATS (order counts from all orders, revenue from valid only) ===
      const currencyMap: Record<string, { orders: number; revenue: number; revenueUSD: number }> = {}
      const countryMap: Record<string, { orders: number; customers: Set<string> }> = {}
      currentOrders.forEach(o => {
        const cc = getCurrency(o)
        const isValid = o.status !== 'cancelled' && o.payment_status !== 'failed' && o.payment_status !== 'expired'
        const usdAmount = isValid ? convertToUSD(o.total_amount || 0, cc) : 0
        if (!currencyMap[cc]) currencyMap[cc] = { orders: 0, revenue: 0, revenueUSD: 0 }
        currencyMap[cc].orders++
        if (isValid) {
          currencyMap[cc].revenue += o.total_amount || 0
          currencyMap[cc].revenueUSD += usdAmount
        }
        const sa = o.shipping_address as any
        const country = sa?.country || sa?.state_province || 'Unknown'
        if (!countryMap[country]) countryMap[country] = { orders: 0, customers: new Set() }
        countryMap[country].orders++
        if (o.customer_email) countryMap[country].customers.add(o.customer_email)
      })
      setRegionalStats({
        byCurrency: Object.entries(currencyMap).map(([currency, d]) => ({ currency, ...d })).sort((a, b) => b.revenueUSD - a.revenueUSD),
        byCountry: Object.entries(countryMap).map(([country, d]) => ({ country, orders: d.orders, customers: d.customers.size })).sort((a, b) => b.orders - a.orders),
        totalByCurrency: {
          IDR: currencyMap['IDR']?.orders || 0,
          USD: currencyMap['USD']?.orders || 0,
          other: Object.entries(currencyMap).filter(([c]) => c !== 'IDR' && c !== 'USD').reduce((s, [, d]) => s + d.orders, 0)
        }
      })

      // === BUSINESS STATS (order counts from all, revenue from valid) ===
      // Payment methods
      const methodMap: Record<string, { orders: number; revenue: number }> = {}
      currentOrders.forEach(o => {
        const isValid = o.status !== 'cancelled' && o.payment_status !== 'failed' && o.payment_status !== 'expired'
        const method = o.payment_method_type || o.payment_gateway || 'Unknown'
        const label = method.toLowerCase().includes('paypal') ? 'PayPal' : method.toLowerCase().includes('stripe') ? 'Stripe' : method.toLowerCase().includes('midtrans') ? 'Midtrans' : method.charAt(0).toUpperCase() + method.slice(1)
        if (!methodMap[label]) methodMap[label] = { orders: 0, revenue: 0 }
        methodMap[label].orders++
        if (isValid) methodMap[label].revenue += convertToUSD(o.total_amount || 0, getCurrency(o))
      })
      const paymentMethods = Object.entries(methodMap).map(([method, d]) => ({ method, ...d })).sort((a, b) => b.orders - a.orders)

      // Cart abandonment (count pending + already expired orders)
      const pendingPaymentOrders = currentOrders.filter(o => o.payment_status === 'pending' || o.payment_status === 'expired')
      const expiredOrders = currentOrders.filter(o => o.payment_status === 'expired' || (o.expiry_time && new Date(o.expiry_time) < new Date()))
      const cartAbandonment = { total: pendingPaymentOrders.length, expired: expiredOrders.length, rate: pendingPaymentOrders.length > 0 ? (expiredOrders.length / pendingPaymentOrders.length) * 100 : 0 }

      // Vouchers
      const ordersWithDiscount = validOrders.filter(o => (o.discount_amount || 0) > 0)
      const totalDiscount = ordersWithDiscount.reduce((s, o) => s + convertToUSD(o.discount_amount || 0, getCurrency(o)), 0)
      const vouchers = { used: ordersWithDiscount.length, totalDiscount, ordersWithVoucher: ordersWithDiscount.length }

      // Fulfillment
      const paidOrders = validOrders.filter(o => o.payment_status === 'completed' || o.payment_status === 'paid')
      const packedWithTimes = paidOrders.filter(o => o.packed_at && o.created_at)
      const avgTimeMs = packedWithTimes.length > 0 ? packedWithTimes.reduce((s, o) => s + (new Date(o.packed_at).getTime() - new Date(o.created_at).getTime()), 0) / packedWithTimes.length : 0
      const fulfillment = { awaiting: paidOrders.filter(o => ['pending', 'processing'].includes(o.status)).length, avgTimeHours: avgTimeMs / (1000 * 60 * 60), shipped: paidOrders.filter(o => o.shipped_at).length, delivered: paidOrders.filter(o => o.status === 'delivered').length }

      // Customer metrics (count from all orders)
      const customerOrderMap: Record<string, number> = {}
      currentOrders.forEach(o => { if (o.customer_email) customerOrderMap[o.customer_email] = (customerOrderMap[o.customer_email] || 0) + 1 })
      const totalCustomers = Object.keys(customerOrderMap).length
      const repeatCustomers = Object.values(customerOrderMap).filter(c => c > 1).length
      const customerMetrics = { repeatCustomers, repeatRate: totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0, avgOrdersPerCustomer: totalCustomers > 0 ? currentOrderCount / totalCustomers : 0 }

      // Cancellation
      const cancelledOrders = currentOrders.filter(o => o.status === 'cancelled').length
      const cancellationRate = { cancelled: cancelledOrders, total: currentOrderCount, rate: currentOrderCount > 0 ? (cancelledOrders / currentOrderCount) * 100 : 0 }

      // AOV (only from valid/non-cancelled orders)
      const currentAOV = validOrders.length > 0 ? validOrders.reduce((s, o) => s + convertToUSD(o.total_amount || 0, getCurrency(o)), 0) / validOrders.length : 0
      const prevAOV = prevValidOrders.length > 0 ? prevValidOrders.reduce((s, o) => s + convertToUSD(o.total_amount || 0, getCurrency(o)), 0) / prevValidOrders.length : 0
      const aov = { current: currentAOV, previous: prevAOV, change: prevAOV > 0 ? ((currentAOV - prevAOV) / prevAOV) * 100 : 0 }

      // Basket size (from all orders)
      const totalItems = currentOrders.reduce((s, o) => { const items = (o as any).order_items as any[]; return s + (items?.reduce((is: number, i: any) => is + (i.quantity || 0), 0) || 0) }, 0)
      const basketSize = { avgItems: currentOrderCount > 0 ? totalItems / currentOrderCount : 0, totalItems, orders: currentOrderCount }

      // Tax & shipping (from valid orders only)
      const taxCollected = validOrders.reduce((s, o) => s + convertToUSD(o.tax_amount || 0, getCurrency(o)), 0)
      const shippingCollected = validOrders.reduce((s, o) => s + convertToUSD(o.shipping_amount || 0, getCurrency(o)), 0)
      const paidCount = paidOrders.length
      const taxShipping = { taxCollected, shippingCollected, avgShipping: paidCount > 0 ? shippingCollected / paidCount : 0 }

      // Top customers (order count from all, revenue from valid only)
      const customerRevenueMap: Record<string, { orders: number; revenue: number; lastOrder: string }> = {}
      currentOrders.forEach(o => {
        if (!o.customer_email) return
        const isValid = o.status !== 'cancelled' && o.payment_status !== 'failed' && o.payment_status !== 'expired'
        const usdAmount = isValid ? convertToUSD(o.total_amount || 0, getCurrency(o)) : 0
        if (!customerRevenueMap[o.customer_email]) customerRevenueMap[o.customer_email] = { orders: 0, revenue: 0, lastOrder: '' }
        customerRevenueMap[o.customer_email].orders++
        if (isValid) customerRevenueMap[o.customer_email].revenue += usdAmount
        const od = new Date(o.created_at).toISOString()
        if (od > customerRevenueMap[o.customer_email].lastOrder) customerRevenueMap[o.customer_email].lastOrder = od
      })
      const topCustomers = Object.entries(customerRevenueMap).map(([email, d]) => ({ email, ...d })).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

      // Peak hours
      const hourMap: Record<number, number> = {}
      for (let h = 0; h < 24; h++) hourMap[h] = 0
      currentOrders.forEach(o => { const h = new Date(o.created_at).getHours(); hourMap[h]++ })
      const peakHours = Object.entries(hourMap).map(([hour, orders]) => ({ hour: parseInt(hour), orders })).filter(h => h.orders > 0).sort((a, b) => b.orders - a.orders).slice(0, 6)

      // Revenue split (order count from all, revenue from valid only)
      let newCustomers = 0, returningCustomers = 0, newRevenue = 0, returningRevenue = 0
      currentOrders.forEach(o => {
        if (!o.customer_email) return
        const isValid = o.status !== 'cancelled' && o.payment_status !== 'failed' && o.payment_status !== 'expired'
        const usdAmount = isValid ? convertToUSD(o.total_amount || 0, getCurrency(o)) : 0
        if (customerOrderMap[o.customer_email] === 1) { newCustomers++; newRevenue += usdAmount }
        else { returningCustomers++; returningRevenue += usdAmount }
      })
      const revenueSplit = { newCustomers, returningCustomers, newRevenue, returningRevenue }

      // Inventory turnover (use actual sold from order_items, not marketing products_sold)
      const { data: productData } = await supabase.from('products').select('id, stock_quantity').eq('is_visible', true)
      const totalStock = productData?.reduce((s, p) => s + (p.stock_quantity || 0), 0) || 0
      const totalActualSold = Object.values(actualSoldMap).reduce((s, v) => s + v, 0)
      const lowSellers = productData?.filter(p => !actualSoldMap[p.id]).length || 0
      const inventoryTurnover = { totalSold: totalActualSold, totalStock, turnoverRate: totalStock > 0 ? (totalActualSold / totalStock) * 100 : 0, lowSellers }

      setBusinessStats({ paymentMethods, cartAbandonment, vouchers, fulfillment, customerMetrics, cancellationRate, aov, basketSize, taxShipping, topCustomers, peakHours, revenueSplit, inventoryTurnover })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
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
      <div className="space-y-8 p-0 animate-in fade-in duration-200">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-40 rounded-lg bg-gray-200 animate-pulse" />
            <div className="h-4 w-56 rounded bg-gray-100 animate-pulse" />
          </div>
          <div className="h-10 w-32 rounded-lg bg-gray-200 animate-pulse" />
        </div>

        {/* KPI cards skeleton */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 rounded-lg bg-gray-100 animate-pulse" />
          ))}
        </div>

        {/* Section skeleton */}
        <div className="space-y-6">
          <div className="h-4 w-48 mx-auto rounded bg-gray-100 animate-pulse" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 rounded-lg bg-gray-100 animate-pulse" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 rounded-lg bg-gray-100 animate-pulse" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-64 rounded-lg bg-gray-100 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">Business overview and key metrics</p>
        </div>
        <Dropdown
          value={period}
          onChange={setPeriod}
          options={[
            { value: '7', label: 'Last 7 days' },
            { value: '30', label: 'Last 30 days' },
            { value: '90', label: 'Last 90 days' },
            { value: '365', label: 'Last year' },
          ]}
          className="w-40"
        />
      </div>

      {/* === SECTION: Overview === */}
      <div className="space-y-6">
        <div className="mb-3 flex items-center gap-2">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-montserrat font-semibold uppercase tracking-wider text-gray-500">Overview</span>
          <div className="h-px flex-1 bg-gray-200" />
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
      </div>

      {/* === SECTION: Operations === */}
      <div className="space-y-6">
        <div className="mb-3 flex items-center gap-2">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-montserrat font-semibold uppercase tracking-wider text-gray-500">Operations</span>
          <div className="h-px flex-1 bg-gray-200" />
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
      </div>

      {/* === SECTION: Regional Analytics === */}
      <div className="space-y-6">
        <div className="mb-3 flex items-center gap-2">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-montserrat font-semibold uppercase tracking-wider text-gray-500">Regional Analytics</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

      {/* Regional Analytics */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Orders & Revenue by Currency/Region */}
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Orders by Currency Region</h2>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {regionalStats.byCurrency.length === 0 ? (
              <p className="text-center text-gray-500 py-6">No regional data available</p>
            ) : (
              regionalStats.byCurrency.map((item) => {
                const totalOrders = regionalStats.byCurrency.reduce((sum, i) => sum + i.orders, 0) || 1
                const pct = (item.orders / totalOrders) * 100
                const regionLabel = item.currency === 'IDR' ? 'Indonesia (IDR)' 
                  : item.currency === 'USD' ? 'US / International (USD)' 
                  : item.currency
                return (
                  <div key={item.currency} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-900">{regionLabel}</span>
                      <span className="text-gray-600">{item.orders} orders</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Revenue: {formatPrice(item.revenueUSD, { id: '', code: 'USD', name: '', currency_code: 'USD', currency_symbol: '$', tax_rate: 0, is_active: true, created_at: '' })}</span>
                      <span>{pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${item.currency === 'IDR' ? 'bg-blue-500' : item.currency === 'USD' ? 'bg-green-500' : 'bg-purple-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
          {/* Summary chips */}
          <div className="mt-4 flex flex-wrap gap-2 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              IDR: {regionalStats.totalByCurrency.IDR} orders
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              USD: {regionalStats.totalByCurrency.USD} orders
            </div>
            {regionalStats.totalByCurrency.other > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
                <div className="h-2 w-2 rounded-full bg-purple-500" />
                Other: {regionalStats.totalByCurrency.other} orders
              </div>
            )}
          </div>
        </div>

        {/* Users/Orders by Country */}
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Customers by Region</h2>
            <Globe className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {regionalStats.byCountry.length === 0 ? (
              <p className="text-center text-gray-500 py-6">No country data available</p>
            ) : (
              regionalStats.byCountry.slice(0, 8).map((item) => {
                const totalOrders = regionalStats.byCountry.reduce((sum, i) => sum + i.orders, 0) || 1
                const pct = (item.orders / totalOrders) * 100
                return (
                  <div key={item.country} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-900">{item.country}</span>
                      <span className="text-gray-600">
                        {item.customers} {item.customers === 1 ? 'customer' : 'customers'} · {item.orders} orders
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-luxury-gold"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
      </div>

      {/* === SECTION: Business Performance === */}
      <div className="space-y-6">
        <div className="mb-3 flex items-center gap-2">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-montserrat font-semibold uppercase tracking-wider text-gray-500">Business Performance</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

      {/* Business Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Average Order Value */}
        <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
                <DollarSign className="h-4 w-4 text-indigo-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">Avg Order Value</span>
            </div>
            <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${businessStats.aov.change >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {businessStats.aov.change >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {formatPercent(businessStats.aov.change)}
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatPrice(businessStats.aov.current, { id: '', code: 'USD', name: '', currency_code: 'USD', currency_symbol: '$', tax_rate: 0, is_active: true, created_at: '' })}
          </p>
          <p className="mt-1 text-xs text-gray-500">vs {formatPrice(businessStats.aov.previous, { id: '', code: 'USD', name: '', currency_code: 'USD', currency_symbol: '$', tax_rate: 0, is_active: true, created_at: '' })} prev period</p>
        </div>

        {/* Cart Abandonment */}
        <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100">
                <Clock className="h-4 w-4 text-orange-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">Cart Abandonment</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{businessStats.cartAbandonment.rate.toFixed(1)}%</p>
          <p className="mt-1 text-xs text-gray-500">
            {businessStats.cartAbandonment.expired} expired of {businessStats.cartAbandonment.total} pending
          </p>
        </div>

        {/* Repeat Purchase Rate */}
        <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
                <Users className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">Repeat Purchase</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{businessStats.customerMetrics.repeatRate.toFixed(1)}%</p>
          <p className="mt-1 text-xs text-gray-500">
            {businessStats.customerMetrics.repeatCustomers} returning · {businessStats.customerMetrics.avgOrdersPerCustomer.toFixed(1)} avg orders/customer
          </p>
        </div>

        {/* Cancellation Rate */}
        <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100">
                <XCircle className="h-4 w-4 text-red-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">Cancellation Rate</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{businessStats.cancellationRate.rate.toFixed(1)}%</p>
          <p className="mt-1 text-xs text-gray-500">
            {businessStats.cancellationRate.cancelled} cancelled of {businessStats.cancellationRate.total} orders
          </p>
        </div>
      </div>

      {/* Payment Methods & Fulfillment */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Payment Methods */}
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Payment Methods</h2>
            <CreditCard className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {businessStats.paymentMethods.length === 0 ? (
              <p className="text-center text-gray-500 py-4 text-sm">No payment data</p>
            ) : (
              businessStats.paymentMethods.map((item) => {
                const totalOrders = businessStats.paymentMethods.reduce((sum, i) => sum + i.orders, 0) || 1
                const pct = (item.orders / totalOrders) * 100
                const colors: Record<string, string> = {
                  PayPal: 'bg-blue-500', Stripe: 'bg-purple-500', Midtrans: 'bg-green-500'
                }
                return (
                  <div key={item.method} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-900">{item.method}</span>
                      <span className="text-gray-600">{item.orders} orders</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{formatPrice(item.revenue, { id: '', code: 'USD', name: '', currency_code: 'USD', currency_symbol: '$', tax_rate: 0, is_active: true, created_at: '' })}</span>
                      <span>{pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div className={`h-full rounded-full ${colors[item.method] || 'bg-gray-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Fulfillment Performance */}
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Fulfillment</h2>
            <Truck className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                <span className="text-sm text-gray-700">Awaiting Fulfillment</span>
              </div>
              <span className="text-lg font-bold text-gray-900">{businessStats.fulfillment.awaiting}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-indigo-500" />
                <span className="text-sm text-gray-700">Shipped</span>
              </div>
              <span className="text-lg font-bold text-gray-900">{businessStats.fulfillment.shipped}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm text-gray-700">Delivered</span>
              </div>
              <span className="text-lg font-bold text-gray-900">{businessStats.fulfillment.delivered}</span>
            </div>
            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Avg Fulfillment Time</p>
              <p className="text-lg font-bold text-gray-900">
                {businessStats.fulfillment.avgTimeHours > 0 
                  ? `${businessStats.fulfillment.avgTimeHours.toFixed(1)} hrs` 
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Voucher & Discount Usage */}
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Voucher Usage</h2>
            <Percent className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Orders with Vouchers</p>
              <p className="text-2xl font-bold text-gray-900">{businessStats.vouchers.ordersWithVoucher}</p>
            </div>
            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Total Discount Given</p>
              <p className="text-xl font-bold text-gray-900">
                {formatPrice(businessStats.vouchers.totalDiscount, { id: '', code: 'USD', name: '', currency_code: 'USD', currency_symbol: '$', tax_rate: 0, is_active: true, created_at: '' })}
              </p>
            </div>
            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Adoption Rate</p>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 rounded-full bg-gray-100 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-luxury-gold" 
                    style={{ width: `${businessStats.cancellationRate.total > 0 ? (businessStats.vouchers.ordersWithVoucher / businessStats.cancellationRate.total) * 100 : 0}%` }} 
                  />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {businessStats.cancellationRate.total > 0 ? ((businessStats.vouchers.ordersWithVoucher / businessStats.cancellationRate.total) * 100).toFixed(1) : '0'}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Extended Business Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Avg Items per Order */}
        <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                <ShoppingBag className="h-4 w-4 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">Avg Items/Order</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{businessStats.basketSize.avgItems.toFixed(1)}</p>
          <p className="mt-1 text-xs text-gray-500">
            {businessStats.basketSize.totalItems} items in {businessStats.basketSize.orders} orders
          </p>
        </div>

        {/* Tax Collected */}
        <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                <DollarSign className="h-4 w-4 text-purple-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">Tax Collected</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatPrice(businessStats.taxShipping.taxCollected, { id: '', code: 'USD', name: '', currency_code: 'USD', currency_symbol: '$', tax_rate: 0, is_active: true, created_at: '' })}
          </p>
          <p className="mt-1 text-xs text-gray-500">Total tax revenue collected</p>
        </div>

        {/* Shipping Collected */}
        <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
                <Truck className="h-4 w-4 text-indigo-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">Shipping Revenue</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatPrice(businessStats.taxShipping.shippingCollected, { id: '', code: 'USD', name: '', currency_code: 'USD', currency_symbol: '$', tax_rate: 0, is_active: true, created_at: '' })}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Avg: {formatPrice(businessStats.taxShipping.avgShipping, { id: '', code: 'USD', name: '', currency_code: 'USD', currency_symbol: '$', tax_rate: 0, is_active: true, created_at: '' })}/order
          </p>
        </div>

        {/* Inventory Turnover */}
        <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100">
                <Package className="h-4 w-4 text-orange-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">Inventory Turnover</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{businessStats.inventoryTurnover.turnoverRate.toFixed(1)}%</p>
          <p className="mt-1 text-xs text-gray-500">
            {businessStats.inventoryTurnover.totalSold} sold · {businessStats.inventoryTurnover.totalStock} in stock · {businessStats.inventoryTurnover.lowSellers} never sold
          </p>
        </div>
      </div>
      </div>

      {/* === SECTION: Customer Insights === */}
      <div className="space-y-6">
        <div className="mb-3 flex items-center gap-2">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-montserrat font-semibold uppercase tracking-wider text-gray-500">Customer Insights</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

      {/* Top Customers & Peak Hours & Revenue Split */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top Customers */}
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Top Customers</h2>
            <Users className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {businessStats.topCustomers.length === 0 ? (
              <p className="text-center text-gray-500 py-4 text-sm">No customer data</p>
            ) : (
              businessStats.topCustomers.map((customer, idx) => (
                <div key={customer.email} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-luxury-gold/10 text-xs font-bold text-luxury-gold">
                    #{idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{customer.email}</p>
                    <p className="text-xs text-gray-500">
                      {customer.orders} orders · Last: {new Date(customer.lastOrder).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                    {formatPrice(customer.revenue, { id: '', code: 'USD', name: '', currency_code: 'USD', currency_symbol: '$', tax_rate: 0, is_active: true, created_at: '' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Peak Ordering Hours */}
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Peak Order Hours</h2>
            <Clock className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-2">
            {businessStats.peakHours.length === 0 ? (
              <p className="text-center text-gray-500 py-4 text-sm">No order data</p>
            ) : (
              businessStats.peakHours.map((item) => {
                const maxOrders = Math.max(...businessStats.peakHours.map(h => h.orders), 1)
                const pct = (item.orders / maxOrders) * 100
                const hourLabel = item.hour === 0 ? '12 AM' : item.hour < 12 ? `${item.hour} AM` : item.hour === 12 ? '12 PM' : `${item.hour - 12} PM`
                return (
                  <div key={item.hour} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-600 w-12">{hourLabel}</span>
                    <div className="h-6 flex-1 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full bg-luxury-gold flex items-center justify-end px-2" style={{ width: `${pct}%` }}>
                        <span className="text-[10px] font-bold text-white">{item.orders}</span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* New vs Returning Revenue */}
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Revenue Split</h2>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">New Customers</span>
                <span className="text-sm font-bold text-gray-900">
                  {formatPrice(businessStats.revenueSplit.newRevenue, { id: '', code: 'USD', name: '', currency_code: 'USD', currency_symbol: '$', tax_rate: 0, is_active: true, created_at: '' })}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-2">{businessStats.revenueSplit.newCustomers} customers</p>
              <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full bg-green-500" style={{ width: `${(businessStats.revenueSplit.newRevenue + businessStats.revenueSplit.returningRevenue) > 0 ? (businessStats.revenueSplit.newRevenue / (businessStats.revenueSplit.newRevenue + businessStats.revenueSplit.returningRevenue)) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Returning</span>
                <span className="text-sm font-bold text-gray-900">
                  {formatPrice(businessStats.revenueSplit.returningRevenue, { id: '', code: 'USD', name: '', currency_code: 'USD', currency_symbol: '$', tax_rate: 0, is_active: true, created_at: '' })}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-2">{businessStats.revenueSplit.returningCustomers} orders from returning</p>
              <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${(businessStats.revenueSplit.newRevenue + businessStats.revenueSplit.returningRevenue) > 0 ? (businessStats.revenueSplit.returningRevenue / (businessStats.revenueSplit.newRevenue + businessStats.revenueSplit.returningRevenue)) * 100 : 0}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* === SECTION: Products & Orders === */}
      <div className="space-y-6">
        <div className="mb-3 flex items-center gap-2">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-montserrat font-semibold uppercase tracking-wider text-gray-500">Products & Orders</span>
          <div className="h-px flex-1 bg-gray-200" />
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
              topProducts.map((product, index) => {
                // Parse image_urls (may be JSON string or array)
                const rawImgs = product.image_urls
                const imgUrls: string[] = Array.isArray(rawImgs) ? rawImgs : (() => { try { return JSON.parse(rawImgs as any) || [] } catch { return [] } })()
                const img = imgUrls.find(u => u && !u.includes('placehold.co')) || null

                return (
                <div key={product.id} className="flex items-center gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-lg font-bold text-gray-600">
                    #{index + 1}
                  </div>
                  {img ? (
                    <img
                      src={img}
                      alt={product.name}
                      className="h-14 w-14 flex-shrink-0 rounded-lg object-contain bg-gray-100 p-1 border border-gray-200"
                    />
                  ) : (
                    <div className="h-14 w-14 flex-shrink-0 rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200">
                      <Package className="h-7 w-7 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{product.name}</p>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span>{product.actual_sold || 0} sold</span>
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
                )
              })
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
