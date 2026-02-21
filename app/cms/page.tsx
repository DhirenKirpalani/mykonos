'use client'

import { useUserRole } from '@/hooks/useUserRole'
import { Package, ShoppingCart, Users, TrendingUp } from 'lucide-react'
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
    { name: 'Revenue (MTD)', value: '-', icon: TrendingUp, href: '/cms/analytics' },
  ])

  useEffect(() => {
    fetchStats()
  }, [])

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
        { name: 'Revenue (MTD)', value: '-', icon: TrendingUp, href: '/cms/analytics' },
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Welcome back! Here's what's happening with your store.</p>
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
          <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
          <div className="mt-4 flex items-center justify-center py-8 text-center">
            <p className="text-sm text-gray-500">No recent activity to display</p>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">System Status</h2>
          <div className="mt-4 space-y-4">
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
    </div>
  )
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}
