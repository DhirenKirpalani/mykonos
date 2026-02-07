'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, DollarSign, ShoppingCart, Users, Package, Tag } from 'lucide-react'

interface AnalyticsData {
  revenue: {
    total: number
    change: number
  }
  orders: {
    total: number
    change: number
  }
  customers: {
    total: number
    change: number
  }
  products: {
    total: number
    lowStock: number
  }
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30d')

  useEffect(() => {
    fetchAnalytics()
  }, [period])

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/reports/sales?period=${period}`)
      if (response.ok) {
        const analyticsData = await response.json()
        setData(analyticsData)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Loading analytics...</div>
      </div>
    )
  }

  const stats = [
    {
      name: 'Total Revenue',
      value: `$${data?.revenue.total.toLocaleString() || '0'}`,
      change: data?.revenue.change || 0,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: 'Total Orders',
      value: data?.orders.total.toLocaleString() || '0',
      change: data?.orders.change || 0,
      icon: ShoppingCart,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Total Customers',
      value: data?.customers.total.toLocaleString() || '0',
      change: data?.customers.change || 0,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      name: 'Products',
      value: data?.products.total.toLocaleString() || '0',
      change: data?.products.lowStock || 0,
      icon: Package,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      changeLabel: 'Low stock',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-2 text-gray-600">Track your store performance</p>
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
          <div
            key={stat.name}
            className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">{stat.value}</p>
                <div className="mt-2 flex items-center gap-1">
                  <TrendingUp
                    className={`h-4 w-4 ${
                      stat.change >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  />
                  <span
                    className={`text-sm font-medium ${
                      stat.change >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {stat.change >= 0 ? '+' : ''}
                    {stat.change}%
                  </span>
                  <span className="text-sm text-gray-500">
                    {stat.changeLabel || 'vs last period'}
                  </span>
                </div>
              </div>
              <div className={`rounded-full ${stat.bgColor} p-3`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Top Products</h2>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <p className="font-medium text-gray-900">Mediterranean Breeze</p>
                <p className="text-sm text-gray-500">245 sales</p>
              </div>
              <p className="font-semibold text-gray-900">$12,250</p>
            </div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <p className="font-medium text-gray-900">Ocean Mist</p>
                <p className="text-sm text-gray-500">198 sales</p>
              </div>
              <p className="font-semibold text-gray-900">$9,900</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Sunset Dreams</p>
                <p className="text-sm text-gray-500">176 sales</p>
              </div>
              <p className="font-semibold text-gray-900">$8,800</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Recent Orders</h2>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <p className="font-medium text-gray-900">#ORD-12345</p>
                <p className="text-sm text-gray-500">John Doe</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">$125.00</p>
                <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                  Completed
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <p className="font-medium text-gray-900">#ORD-12344</p>
                <p className="text-sm text-gray-500">Jane Smith</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">$89.50</p>
                <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                  Processing
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">#ORD-12343</p>
                <p className="text-sm text-gray-500">Bob Johnson</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">$210.00</p>
                <span className="inline-flex rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
                  Pending
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Sales Overview</h2>
        <div className="mt-6 h-64 flex items-center justify-center border border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500">Chart visualization would go here</p>
        </div>
      </div>
    </div>
  )
}
