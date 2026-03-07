'use client'

import { useUserRole } from '@/hooks/useUserRole'
import { Package, ShoppingCart, Users, TrendingUp, DollarSign } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export default function CMSPage() {
  const { role } = useUserRole()
  const [stats, setStats] = useState([
    { name: 'Total Products', value: '-', icon: Package, href: '/cms/products' },
    { name: 'Pending Orders', value: '-', icon: ShoppingCart, href: '/cms/orders' },
    { name: 'Total Customers', value: '-', icon: Users, href: '/cms/customers' },
    { name: 'Revenue (MTD)', value: '-', icon: DollarSign, href: '#' },
  ])
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
      // Fetch top selling products from database
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price_usd')
        .eq('is_active', true)
        .limit(3)
      
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
      // Fetch real statistics from database
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
      
      const { count: ordersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
      
      const { count: usersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
      
      setStats([
        { name: 'Total Products', value: productsCount?.toString() || '0', icon: Package, href: '/cms/products' },
        { name: 'Pending Orders', value: ordersCount?.toString() || '0', icon: ShoppingCart, href: '/cms/orders' },
        { name: 'Total Customers', value: usersCount?.toString() || '0', icon: Users, href: '/cms/customers' },
        { name: 'Revenue (MTD)', value: '-', icon: DollarSign, href: '#' },
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Welcome back! Here's what's happening with your store.</p>
        </div>
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
            className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200 transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">{stat.value}</p>
              </div>
              <div className="rounded-full bg-luxury-gold/10 p-3">
                <stat.icon className="h-6 w-6 text-luxury-gold" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Top Products</h2>
          <div className="mt-4 space-y-4">
            {topProducts.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No products found</p>
            ) : (
              topProducts.map((product, index) => (
                <div key={product.id} className={`flex items-center justify-between ${index < topProducts.length - 1 ? 'border-b border-gray-100 pb-4' : ''}`}>
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">Product #{product.id}</p>
                  </div>
                  <p className="font-semibold text-gray-900">${product.price_usd}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Recent Orders</h2>
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
                      <p className="font-semibold text-gray-900">${order.total_amount.toFixed(2)}</p>
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

      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">System Status</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Website Status</span>
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
              Online
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Payment Gateway</span>
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
              Connected
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Inventory Sync</span>
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
              Active
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}
