'use client'

import { useState, useEffect } from 'react'
import { Power, ShieldAlert, Globe, Tag, Wrench, Save, AlertTriangle, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import { ReasonDialog } from '@/components/ui/reason-dialog'
import { supabase } from '@/lib/supabase/client'

interface SystemSetting {
  setting_key: string
  setting_value: {
    enabled?: boolean
    message?: string
    regions?: string[]
  }
  description: string
  updated_at: string
}

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<Record<string, SystemSetting>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [maintenanceMessage, setMaintenanceMessage] = useState('')
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean
    title: string
    description: string
    onConfirm: (reason: string) => void
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {}
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast.error('Please log in to access system settings')
        setLoading(false)
        return
      }

      const response = await fetch('/api/admin/system-settings', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
        setMaintenanceMessage(data.maintenance_mode?.setting_value?.message || '')
      } else {
        const error = await response.json()
        console.error('Failed to fetch settings:', error)
        toast.error(error.error || 'Failed to load system settings')
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Failed to load system settings')
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = async (key: string, value: any, reason?: string) => {
    setSaving(key)
    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast.error('Session expired. Please log in again.')
        return
      }

      const response = await fetch('/api/admin/system-settings', {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ setting_key: key, setting_value: value, reason })
      })

      if (response.ok) {
        await fetchSettings()
        toast.success('Setting updated successfully')
      } else {
        const error = await response.json()
        console.error('API Error:', error)
        toast.error(error.error || error.message || 'Failed to update setting')
      }
    } catch (error: any) {
      console.error('Error updating setting:', error)
      toast.error(error.message || 'Failed to update setting')
    } finally {
      setSaving(null)
    }
  }

  const toggleKillSwitch = async (key: string, currentValue: boolean) => {
    const action = currentValue ? 'disable' : 'enable'
    const feature = key.replace('_enabled', '').replace('_', ' ')
    
    setDialogState({
      isOpen: true,
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} ${feature}`,
      description: 'This will affect all users immediately.',
      onConfirm: async (reason: string) => {
        setDialogState(prev => ({ ...prev, isOpen: false }))
        await updateSetting(key, { enabled: !currentValue }, reason)
      }
    })
  }

  const toggleMaintenanceMode = async () => {
    const currentValue = settings.maintenance_mode?.setting_value?.enabled || false
    const action = currentValue ? 'disable' : 'enable'
    
    setDialogState({
      isOpen: true,
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} maintenance mode`,
      description: !currentValue ? 'This will make the site unavailable to customers.' : 'This will restore customer access.',
      onConfirm: async (reason: string) => {
        setDialogState(prev => ({ ...prev, isOpen: false }))
        await updateSetting('maintenance_mode', {
          enabled: !currentValue,
          message: maintenanceMessage || 'We are currently performing maintenance. Please check back soon.'
        }, reason)
      }
    })
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Loading system settings...</div>
      </div>
    )
  }

  const killSwitches = [
    {
      key: 'checkout_enabled',
      icon: ShoppingCart,
      title: 'Checkout',
      description: 'Allow customers to complete checkout and place orders',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      key: 'payments_enabled',
      icon: Power,
      title: 'Payment Processing',
      description: 'Enable payment gateway processing for orders',
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      key: 'promo_codes_enabled',
      icon: Tag,
      title: 'Promo Codes',
      description: 'Allow customers to apply discount codes at checkout',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
        <p className="mt-2 text-gray-600">Manage operational controls and kill switches</p>
      </div>

      {/* Maintenance Mode */}
      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-red-100 p-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">Maintenance Mode</h2>
              <p className="mt-1 text-sm text-gray-600">
                Enable site-wide maintenance mode to prevent customer access
              </p>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maintenance Message
                </label>
                <textarea
                  value={maintenanceMessage}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                  placeholder="Enter message to display to customers..."
                />
              </div>
              
              <div className="mt-4 rounded-lg bg-blue-50 p-3 border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Changes take effect immediately for new visitors. Active users will see the maintenance page on their next page load or refresh.
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={toggleMaintenanceMode}
            disabled={saving === 'maintenance_mode'}
            className={`rounded-lg px-6 py-2 text-sm font-medium transition-colors ${
              settings.maintenance_mode?.setting_value?.enabled
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            } disabled:opacity-50`}
          >
            {saving === 'maintenance_mode' ? 'Updating...' : 
             settings.maintenance_mode?.setting_value?.enabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </div>

      {/* Kill Switches */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Operational Kill Switches</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {killSwitches.map((item) => {
            const isEnabled = settings[item.key]?.setting_value?.enabled ?? true
            return (
              <div
                key={item.key}
                className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`rounded-full ${item.bgColor} p-3`}>
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <button
                    onClick={() => toggleKillSwitch(item.key, isEnabled)}
                    disabled={saving === item.key}
                    className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-colors ${
                      isEnabled
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    } disabled:opacity-50`}
                  >
                    {saving === item.key ? '...' : isEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
                <h3 className="font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{item.description}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Audit Trail Link */}
      <div className="rounded-lg bg-gray-50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">System Settings Audit Log</h3>
            <p className="mt-1 text-sm text-gray-600">
              View all changes made to system settings
            </p>
          </div>
          <button className="rounded-lg bg-luxury-navy px-4 py-2 text-sm font-medium text-white hover:bg-luxury-navy/90">
            View Audit Log
          </button>
        </div>
      </div>

      {/* Warning Notice */}
      <div className="rounded-lg bg-yellow-50 p-4 border border-yellow-200">
        <div className="flex gap-3">
          <ShieldAlert className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-900">Important Notice</h4>
            <p className="mt-1 text-sm text-yellow-700">
              All changes to system settings are logged and require a reason. These controls affect all users immediately.
              Use with caution and only when necessary.
            </p>
          </div>
        </div>
      </div>

      {/* Reason Dialog */}
      <ReasonDialog
        isOpen={dialogState.isOpen}
        title={dialogState.title}
        description={dialogState.description}
        onConfirm={dialogState.onConfirm}
        onCancel={() => setDialogState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  )
}
