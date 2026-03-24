'use client'

import { useState, useEffect } from 'react'
import { Search, Eye, Mail, Phone, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface Customer {
  id?: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  country: string
  created_at: string
  order_count?: number
  total_spent?: number
  is_guest?: boolean
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers')
      if (response.ok) {
        const data = await response.json()
        setCustomers(data)
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCustomers = customers.filter(customer =>
    customer.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const SkeletonRows = () => (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="py-4">
            <div className="space-y-1.5">
              <div className="h-4 w-32 rounded bg-gray-200" />
              <div className="h-3 w-40 rounded bg-gray-100" />
            </div>
          </td>
          <td className="py-4">
            <div className="space-y-1.5">
              <div className="h-3 w-36 rounded bg-gray-200" />
              <div className="h-3 w-24 rounded bg-gray-100" />
            </div>
          </td>
          <td className="py-4"><div className="h-4 w-20 rounded bg-gray-200" /></td>
          <td className="py-4"><div className="h-4 w-8 rounded bg-gray-200" /></td>
          <td className="py-4"><div className="h-4 w-16 rounded bg-gray-200" /></td>
          <td className="py-4"><div className="h-4 w-20 rounded bg-gray-200" /></td>
        </tr>
      ))}
    </>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
        <p className="mt-2 text-gray-600">View and manage customer accounts</p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left text-sm font-medium text-gray-500">
                <th className="pb-3">Customer</th>
                <th className="pb-3">Contact</th>
                <th className="pb-3">Location</th>
                <th className="pb-3">Orders</th>
                <th className="pb-3">Total Spent</th>
                <th className="pb-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? <SkeletonRows /> : filteredCustomers.map((customer, index) => (
                <tr key={customer.id || customer.email || index} className="text-sm">
                  <td className="py-4">
                    <div>
                      <div className="font-medium text-gray-900">
                        {customer.first_name} {customer.last_name}
                        {customer.is_guest && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                            Guest
                          </span>
                        )}
                      </div>
                      <div className="text-gray-500">{customer.email}</div>
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="h-3 w-3" />
                        <span className="text-xs">{customer.email}</span>
                      </div>
                      {customer.phone && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone className="h-3 w-3" />
                          <span className="text-xs">{customer.phone}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="h-3 w-3" />
                      <span>{customer.country || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="py-4 text-gray-900">
                    {customer.order_count || 0}
                  </td>
                  <td className="py-4 font-medium text-gray-900">
                    ${(customer.total_spent || 0).toFixed(2)}
                  </td>
                  <td className="py-4 text-gray-600">
                    {new Date(customer.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filteredCustomers.length === 0 && (
            <div className="py-12 text-center text-gray-500">
              No customers found.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
