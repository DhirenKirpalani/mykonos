'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { RefreshCw, Package, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import { ShippingJobDashboard } from '@/lib/types/shipping'

export default function ShippingJobsPage() {
  const [jobs, setJobs] = useState<ShippingJobDashboard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [retryingJobs, setRetryingJobs] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchJobs()
    
    const interval = setInterval(fetchJobs, 10000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('shipping_jobs_dashboard')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error

      setJobs(data || [])
    } catch (error) {
      console.error('Failed to fetch shipping jobs:', error)
      toast.error('Failed to load shipping jobs')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetry = async (jobId: string) => {
    setRetryingJobs(prev => new Set(prev).add(jobId))

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Not authenticated')
        return
      }

      const response = await fetch('/api/admin/shipping/retry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ job_id: jobId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to retry job')
      }

      toast.success('Job queued for retry')
      await fetchJobs()
    } catch (error) {
      console.error('Failed to retry job:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to retry job')
    } finally {
      setRetryingJobs(prev => {
        const next = new Set(prev)
        next.delete(jobId)
        return next
      })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'processing':
        return <Clock className="h-5 w-5 text-blue-600 animate-spin" />
      case 'pending':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      default:
        return <Package className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-semibold'
    switch (status) {
      case 'success':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'failed':
        return `${baseClasses} bg-red-100 text-red-800`
      case 'processing':
        return `${baseClasses} bg-blue-100 text-blue-800`
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  const stats = {
    total: jobs.length,
    pending: jobs.filter(j => j.status === 'pending').length,
    processing: jobs.filter(j => j.status === 'processing').length,
    success: jobs.filter(j => j.status === 'success').length,
    failed: jobs.filter(j => j.status === 'failed').length,
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="h-12 w-12 animate-spin mx-auto mb-4 text-luxury-gold" />
          <p className="text-muted-foreground">Loading shipping jobs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-border/40 bg-luxury-gray-light py-8">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-4xl font-bold mb-2">Shipping Jobs</h1>
              <p className="text-muted-foreground">Monitor and manage async shipping job queue</p>
            </div>
            <Button onClick={fetchJobs} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white border border-border/40 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Total Jobs</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-sm text-yellow-700 mb-1">Pending</div>
            <div className="text-2xl font-bold text-yellow-800">{stats.pending}</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-700 mb-1">Processing</div>
            <div className="text-2xl font-bold text-blue-800">{stats.processing}</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm text-green-700 mb-1">Success</div>
            <div className="text-2xl font-bold text-green-800">{stats.success}</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-sm text-red-700 mb-1">Failed</div>
            <div className="text-2xl font-bold text-red-800">{stats.failed}</div>
          </div>
        </div>

        <div className="bg-white border border-border/40 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-luxury-gray-light border-b border-border/40">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Tracking
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Retries
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-luxury-gray-light/50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(job.status)}
                        <span className={getStatusBadge(job.status)}>
                          {job.status.toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium">{job.order_number}</div>
                      <div className="text-xs text-muted-foreground">${job.total_amount.toFixed(2)}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm">{job.customer_email}</div>
                    </td>
                    <td className="px-4 py-4">
                      {job.tracking_number ? (
                        <div className="text-sm font-mono">{job.tracking_number}</div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not yet assigned</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm">
                        {job.retry_count} / {job.max_retries}
                      </div>
                      {job.last_error && (
                        <div className="text-xs text-red-600 mt-1 max-w-xs truncate" title={job.last_error}>
                          {job.last_error}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">
                      {formatDate(job.created_at)}
                    </td>
                    <td className="px-4 py-4">
                      {(job.status === 'failed' || job.status === 'processing') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRetry(job.id)}
                          disabled={retryingJobs.has(job.id)}
                        >
                          {retryingJobs.has(job.id) ? (
                            <>
                              <Clock className="h-3 w-3 mr-1 animate-spin" />
                              Retrying...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Retry
                            </>
                          )}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {jobs.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No shipping jobs found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
