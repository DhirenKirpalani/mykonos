'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Edit, Trash2, Copy, ShoppingBag, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'

interface PromoCode {
  id: string
  name: string
  code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_purchase_amount: number | null
  usage_limit_global: number | null
  usage_count: number
  is_active: boolean
  valid_from: string | null
  valid_until: string | null
  scope: 'all' | 'specific_products' | 'categories'
  applicable_product_ids: string[] | null
  applicable_category: string | null
  visibility: 'public' | 'private'
}

export default function PromoCodesPage() {
  const router = useRouter()
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'ongoing' | 'coming_soon' | 'expired' | 'inactive'>('all')
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; promoId: string | null; promoName: string }>({ isOpen: false, promoId: null, promoName: '' })
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchPromoCodes()
  }, [])

  const fetchPromoCodes = async () => {
    try {
      const response = await fetch('/api/promo-codes')
      if (response.ok) {
        const data = await response.json()
        setPromoCodes(data)
      }
    } catch (error) {
      console.error('Error fetching promo codes:', error)
    } finally {
      setLoading(false)
    }
  }

  const getVoucherStatus = (validFrom: string | null, validUntil: string | null, isActive: boolean) => {
    if (!isActive) return { label: 'Inactive', color: 'bg-gray-100 text-gray-800' }
    
    // Get current time in UTC+7 (Jakarta timezone) for regional status calculation
    const nowJakarta = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
    
    // Parse dates from database (stored as UTC) and convert to Jakarta time for comparison
    const startDate = validFrom ? new Date(new Date(validFrom).toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })) : null
    const endDate = validUntil ? new Date(new Date(validUntil).toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })) : null
    
    if (startDate && nowJakarta < startDate) {
      return { label: 'Coming Soon', color: 'bg-blue-100 text-blue-800' }
    }
    if (endDate && nowJakarta > endDate) {
      return { label: 'Expired', color: 'bg-red-100 text-red-800' }
    }
    return { label: 'Ongoing', color: 'bg-green-100 text-green-800' }
  }

  const getScopeLabel = (scope: string, applicableProductIds: string[] | null, applicableCategory: string | null) => {
    if (scope === 'all') return 'All Products'
    if (scope === 'specific_products') return `${applicableProductIds?.length || 0} Products`
    if (scope === 'categories') return applicableCategory || 'Category'
    return scope
  }

  const handleDuplicate = async (promo: PromoCode) => {
    try {
      const response = await fetch('/api/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${promo.name} (Copy)`,
          code: `${promo.code}_COPY`,
          discount_type: promo.discount_type,
          discount_value: promo.discount_value,
          min_purchase_amount: promo.min_purchase_amount,
          max_discount_cap: null,
          usage_limit: promo.usage_limit_global,
          max_uses_per_user: null,
          scope: promo.scope,
          applicable_product_ids: promo.applicable_product_ids,
          applicable_category: promo.applicable_category,
          valid_from: promo.valid_from,
          valid_until: promo.valid_until,
          is_active: false,
        }),
      })
      if (response.ok) {
        toast.success('Voucher duplicated successfully')
        fetchPromoCodes()
      } else {
        toast.error('Failed to duplicate voucher')
      }
    } catch (error) {
      console.error('Error duplicating voucher:', error)
      toast.error('Failed to duplicate voucher')
    }
  }

  const handleDelete = async () => {
    if (!deleteModal.promoId) return
    
    setDeleting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/promo-codes/${deleteModal.promoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })
      if (response.ok) {
        toast.success('Voucher deleted successfully')
        fetchPromoCodes()
        setDeleteModal({ isOpen: false, promoId: null, promoName: '' })
      } else {
        toast.error('Failed to delete voucher')
      }
    } catch (error) {
      console.error('Error deleting voucher:', error)
      toast.error('Failed to delete voucher')
    } finally {
      setDeleting(false)
    }
  }

  const filteredPromoCodes = promoCodes.filter(promo => {
    const matchesSearch = promo.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      promo.code.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (!matchesSearch) return false
    
    if (statusFilter === 'all') return true
    
    const status = getVoucherStatus(promo.valid_from, promo.valid_until, promo.is_active)
    const statusKey = status.label.toLowerCase().replace(' ', '_')
    
    return statusKey === statusFilter
  })

  const SkeletonRows = () => (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="py-4"><div className="h-4 w-32 rounded bg-gray-200" /></td>
          <td className="py-4"><div className="h-4 w-24 rounded bg-gray-200 font-mono" /></td>
          <td className="py-4"><div className="h-4 w-20 rounded bg-gray-200" /></td>
          <td className="py-4"><div className="h-4 w-16 rounded bg-gray-200" /></td>
          <td className="py-4"><div className="h-4 w-16 rounded bg-gray-200" /></td>
          <td className="py-4"><div className="h-4 w-12 rounded bg-gray-200" /></td>
          <td className="py-4"><div className="h-4 w-24 rounded bg-gray-200" /></td>
          <td className="py-4"><div className="h-6 w-20 rounded-full bg-gray-200" /></td>
          <td className="py-4">
            <div className="flex gap-1">
              <div className="h-8 w-8 rounded bg-gray-200" />
              <div className="h-8 w-8 rounded bg-gray-200" />
              <div className="h-8 w-8 rounded bg-gray-200" />
              <div className="h-8 w-8 rounded bg-gray-200" />
            </div>
          </td>
        </tr>
      ))}
    </>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vouchers</h1>
          <p className="mt-2 text-gray-600">Manage discount codes and promotions</p>
        </div>
        <Link href="/cms/promo-codes/new">
          <Button className="bg-luxury-gold text-luxury-navy hover:bg-luxury-gold/90">
            <Plus className="mr-2 h-4 w-4" />
            Create Voucher
          </Button>
        </Link>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div className="mb-6 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search vouchers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
          >
            <option value="all">All Status</option>
            <option value="ongoing">Ongoing</option>
            <option value="coming_soon">Coming Soon</option>
            <option value="expired">Expired</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="pb-3">Voucher Name</th>
                <th className="pb-3">Code</th>
                <th className="pb-3">Scope</th>
                <th className="pb-3">Discount</th>
                <th className="pb-3">Total Limit</th>
                <th className="pb-3">Times Used</th>
                <th className="pb-3">Validity Period</th>
                <th className="pb-3">Visibility</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? <SkeletonRows /> : filteredPromoCodes.map((promo) => {
                const status = getVoucherStatus(promo.valid_from, promo.valid_until, promo.is_active)
                return (
                  <tr key={promo.id} className="text-sm hover:bg-gray-50">
                    <td className="py-4">
                      <div className="font-medium text-gray-900">{promo.name || 'Unnamed Voucher'}</div>
                    </td>
                    <td className="py-4">
                      <div className="font-mono text-xs font-medium text-gray-900">{promo.code}</div>
                    </td>
                    <td className="py-4 text-gray-600">
                      <span className="text-xs">{getScopeLabel(promo.scope, promo.applicable_product_ids, promo.applicable_category)}</span>
                    </td>
                    <td className="py-4 text-gray-900 font-medium">
                      {promo.discount_type === 'percentage' 
                        ? `${promo.discount_value}%` 
                        : `Rp${promo.discount_value.toLocaleString('id-ID')}`}
                    </td>
                    <td className="py-4 text-gray-600">
                      {promo.usage_limit_global || '∞'}
                    </td>
                    <td className="py-4 text-gray-900 font-medium">
                      {promo.usage_count}
                    </td>
                    <td className="py-4 text-gray-600 text-xs">
                      {promo.valid_from && promo.valid_until
                        ? `${new Date(promo.valid_from).toLocaleString('en-GB', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '').replace(/\//g, '/').replace(' ', ', ')} - ${new Date(promo.valid_until).toLocaleString('en-GB', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '').replace(/\//g, '/').replace(' ', ', ')}`
                        : promo.valid_until
                        ? `Until ${new Date(promo.valid_until).toLocaleString('en-GB', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '').replace(/\//g, '/').replace(' ', ', ')}`
                        : 'No expiry'}
                    </td>
                    <td className="py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        promo.visibility === 'public' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {promo.visibility === 'public' ? 'Public' : 'Private'}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-1">
                        <Link href={`/cms/promo-codes/${promo.id}`}>
                          <button
                            className="rounded p-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        </Link>
                        <button
                          onClick={() => handleDuplicate(promo)}
                          className="rounded p-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                          title="Duplicate"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <Link href={`/cms/orders?voucher=${promo.code}`}>
                          <button
                            className="rounded p-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                            title="View Orders"
                          >
                            <ShoppingBag className="h-4 w-4" />
                          </button>
                        </Link>
                        <button
                          onClick={() => setDeleteModal({ isOpen: true, promoId: promo.id, promoName: promo.name || promo.code })}
                          className="rounded p-1.5 text-red-600 hover:bg-red-50 hover:text-red-700"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!loading && filteredPromoCodes.length === 0 && (
            <div className="py-12 text-center text-gray-500">
              No vouchers found. Create your first voucher to get started.
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Delete Voucher</h3>
              <button
                onClick={() => setDeleteModal({ isOpen: false, promoId: null, promoName: '' })}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-6 text-sm text-gray-600">
              Are you sure you want to delete the voucher <strong>{deleteModal.promoName}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModal({ isOpen: false, promoId: null, promoName: '' })}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Voucher'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
