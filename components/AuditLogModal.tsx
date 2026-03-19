'use client'

import { useState, useEffect } from 'react'
import { X, Clock, User } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AuditLog {
  id: string
  entity_type: 'product' | 'order'
  entity_id: string
  action: string
  changes: any
  user_id: string
  user_email: string
  created_at: string
}

interface AuditLogModalProps {
  isOpen: boolean
  onClose: () => void
  entityType: 'product' | 'order'
  entityId: string
  entityName: string
}

export function AuditLogModal({ isOpen, onClose, entityType, entityId, entityName }: AuditLogModalProps) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchAuditLogs()
    }
  }, [isOpen, entityId])

  const fetchAuditLogs = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await (await import('@/lib/supabase/client')).supabase.auth.getSession()
      
      if (!session) {
        console.error('No session found')
        setLoading(false)
        return
      }

      const response = await fetch(`/api/audit-logs?entity_type=${entityType}&entity_id=${entityId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setLogs(data)
      } else {
        console.error('Failed to fetch audit logs:', await response.text())
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatChanges = (changes: any) => {
    if (!changes) return null
    
    // Handle empty object
    if (Object.keys(changes).length === 0) {
      return <div className="text-sm text-gray-500">No changes recorded</div>
    }
    
    return Object.entries(changes).map(([key, value]: [string, any]) => {
      // Handle old format with from/to
      if (typeof value === 'object' && value !== null && 'from' in value && 'to' in value) {
        return (
          <div key={key} className="text-sm">
            <span className="font-medium text-gray-700">{key}:</span>{' '}
            <span className="text-red-600 line-through">{String(value.from)}</span>{' '}
            → <span className="text-green-600">{String(value.to)}</span>
          </div>
        )
      }
      
      // Handle new format (raw values)
      return (
        <div key={key} className="text-sm">
          <span className="font-medium text-gray-700">{key}:</span>{' '}
          <span className="text-green-600">
            {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
          </span>
        </div>
      )
    })
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-3xl max-h-[80vh] overflow-hidden rounded-lg bg-white shadow-xl">
          <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Audit Log</h2>
              <p className="text-sm text-gray-600">{entityName}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(80vh - 80px)' }}>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-500">Loading audit logs...</div>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="h-12 w-12 text-gray-300 mb-3" />
                <p className="text-gray-500">No audit logs found</p>
                <p className="text-sm text-gray-400 mt-1">Changes to this {entityType} will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-4 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-900">{log.user_email}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {formatDate(log.created_at)}
                      </div>
                    </div>
                    <div className="mb-2">
                      <span className="inline-flex items-center rounded-full bg-luxury-gold/10 px-2.5 py-0.5 text-xs font-medium text-luxury-gold">
                        {log.action}
                      </span>
                    </div>
                    {log.changes && (
                      <div className="mt-3 space-y-1 rounded-md bg-white p-3 border border-gray-200">
                        {formatChanges(log.changes)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="sticky bottom-0 border-t border-gray-200 bg-white px-6 py-4">
            <Button onClick={onClose} variant="outline" className="w-full">
              Close
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
