'use client'

import { useState, useEffect } from 'react'
import { Mail, Search, Trash2, UserPlus, Download, Filter, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface Subscriber {
  id: string
  email: string
  user_id: string | null
  is_active: boolean
  subscribed_at: string
  unsubscribed_at: string | null
  source: string
  created_at: string
}

export default function NewsletterManagement() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'unsubscribed'>('all')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    fetchSubscribers()
  }, [page, statusFilter, searchTerm])

  const fetchSubscribers = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        showMessage('error', 'Not authenticated')
        setLoading(false)
        return
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      })

      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      if (searchTerm) {
        params.append('search', searchTerm)
      }

      const response = await fetch(`/api/admin/newsletter?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      const data = await response.json()

      if (response.ok) {
        setSubscribers(data.subscribers)
        setTotal(data.total)
        setTotalPages(data.totalPages)
      } else {
        showMessage('error', data.error || 'Failed to fetch subscribers')
      }
    } catch (error) {
      showMessage('error', 'Failed to fetch subscribers')
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const handleAddSubscriber = async () => {
    if (!newEmail) return

    setActionLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        showMessage('error', 'Not authenticated')
        setActionLoading(false)
        return
      }

      const response = await fetch('/api/admin/newsletter', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ email: newEmail }),
      })

      const data = await response.json()

      if (response.ok) {
        showMessage('success', 'Subscriber added successfully')
        setNewEmail('')
        setShowAddModal(false)
        fetchSubscribers()
      } else {
        showMessage('error', data.error || 'Failed to add subscriber')
      }
    } catch (error) {
      showMessage('error', 'Failed to add subscriber')
    } finally {
      setActionLoading(false)
    }
  }

  const handleBulkAction = async (action: 'delete' | 'unsubscribe' | 'resubscribe') => {
    if (selectedIds.length === 0) return

    if (action === 'delete' && !confirm(`Are you sure you want to delete ${selectedIds.length} subscriber(s)?`)) {
      return
    }

    setActionLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        showMessage('error', 'Not authenticated')
        setActionLoading(false)
        return
      }

      const response = await fetch('/api/admin/newsletter/bulk', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ action, ids: selectedIds }),
      })

      const data = await response.json()

      if (response.ok) {
        showMessage('success', data.message)
        setSelectedIds([])
        fetchSubscribers()
      } else {
        showMessage('error', data.error || 'Failed to perform action')
      }
    } catch (error) {
      showMessage('error', 'Failed to perform action')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteSingle = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subscriber?')) return

    setActionLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        showMessage('error', 'Not authenticated')
        setActionLoading(false)
        return
      }

      const response = await fetch(`/api/admin/newsletter?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const data = await response.json()

      if (response.ok) {
        showMessage('success', 'Subscriber deleted successfully')
        fetchSubscribers()
      } else {
        showMessage('error', data.error || 'Failed to delete subscriber')
      }
    } catch (error) {
      showMessage('error', 'Failed to delete subscriber')
    } finally {
      setActionLoading(false)
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === subscribers.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(subscribers.map(s => s.id))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const exportSubscribers = () => {
    const csv = [
      ['Email', 'Status', 'Source', 'Subscribed At', 'Unsubscribed At'].join(','),
      ...subscribers.map(s => [
        s.email,
        s.is_active ? 'Active' : 'Unsubscribed',
        s.source,
        new Date(s.subscribed_at).toLocaleDateString(),
        s.unsubscribed_at ? new Date(s.unsubscribed_at).toLocaleDateString() : ''
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `newsletter-subscribers-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Newsletter Subscribers</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Total: {total} subscribers
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Add Subscriber
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'}`}>
          {message.text}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="unsubscribed">Unsubscribed</option>
          </select>
          <button
            onClick={exportSubscribers}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {selectedIds.length} selected
          </span>
          <button
            onClick={() => handleBulkAction('unsubscribe')}
            disabled={actionLoading}
            className="text-sm px-3 py-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded transition-colors"
          >
            Unsubscribe
          </button>
          <button
            onClick={() => handleBulkAction('resubscribe')}
            disabled={actionLoading}
            className="text-sm px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded transition-colors"
          >
            Resubscribe
          </button>
          <button
            onClick={() => handleBulkAction('delete')}
            disabled={actionLoading}
            className="text-sm px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded transition-colors"
          >
            Delete
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : subscribers.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No subscribers found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === subscribers.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Source</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Subscribed</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {subscribers.map((subscriber) => (
                    <tr key={subscriber.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(subscriber.id)}
                          onChange={() => toggleSelect(subscriber.id)}
                          className="w-4 h-4 text-purple-600 rounded"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{subscriber.email}</td>
                      <td className="px-4 py-3">
                        {subscriber.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 dark:bg-gray-700 dark:text-gray-400 rounded-full">
                            <XCircle className="w-3 h-3" />
                            Unsubscribed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 capitalize">{subscriber.source}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(subscriber.subscribed_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteSingle(subscriber.id)}
                          disabled={actionLoading}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Add Subscriber</h3>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Enter email address"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={handleAddSubscriber}
                disabled={actionLoading || !newEmail}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                {actionLoading ? 'Adding...' : 'Add'}
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setNewEmail('')
                }}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
