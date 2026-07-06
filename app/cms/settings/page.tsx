'use client'

import { useState, useEffect } from 'react'
import { Power, ShieldAlert, Globe, Tag, Wrench, Save, AlertTriangle, ShoppingCart, X, Truck, UserPlus, Heart, Mail, Bell, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import { ReasonDialog } from '@/components/ui/reason-dialog'
import { supabase } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DEFAULT_PAYMENT_GATEWAY_CONFIG,
  type PaymentGateway,
  type PaymentGatewayConfig,
  type PaymentRegionKey,
} from '@/lib/utils/payment'

interface SystemSetting {
  setting_key: string
  setting_value: {
    enabled?: boolean
    message?: string
    regions?: string[]
    closeTime?: string
    location?: string
  }
  description: string
  updated_at: string
}

interface AuditLogEntry {
  id: string
  setting_key: string
  old_value: any
  new_value: any
  changed_by: string
  reason: string
  created_at: string
  user_email?: string
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
  const [auditLogOpen, setAuditLogOpen] = useState(false)
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [loadingAudit, setLoadingAudit] = useState(false)
  const [gatewayConfig, setGatewayConfig] = useState<PaymentGatewayConfig>(DEFAULT_PAYMENT_GATEWAY_CONFIG)
  const [savingGateways, setSavingGateways] = useState(false)

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
        if (data.payment_gateways?.setting_value) {
          setGatewayConfig(data.payment_gateways.setting_value as PaymentGatewayConfig)
        }
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

  const ALL_GATEWAYS: { key: PaymentGateway; label: string; implemented: boolean }[] = [
    { key: 'midtrans', label: 'Midtrans', implemented: true },
    { key: 'stripe', label: 'Stripe', implemented: true },
    { key: 'paypal', label: 'PayPal', implemented: false },
  ]

  const toggleGatewayEnabled = (regionKey: PaymentRegionKey, gateway: PaymentGateway) => {
    setGatewayConfig(prev => {
      const region = prev[regionKey]
      const isEnabled = region.enabled.includes(gateway)
      const newEnabled = isEnabled
        ? region.enabled.filter(g => g !== gateway)
        : [...region.enabled, gateway]

      // If we disabled the current default, fall back to the first remaining enabled gateway
      const newDefault = newEnabled.includes(region.default)
        ? region.default
        : newEnabled[0] || region.default

      return {
        ...prev,
        [regionKey]: { enabled: newEnabled, default: newDefault }
      }
    })
  }

  const setGatewayDefault = (regionKey: PaymentRegionKey, gateway: PaymentGateway) => {
    setGatewayConfig(prev => ({
      ...prev,
      [regionKey]: { ...prev[regionKey], default: gateway }
    }))
  }

  const saveGatewayConfig = async () => {
    // Basic validation: every region must have at least one enabled gateway
    for (const key of Object.keys(gatewayConfig) as PaymentRegionKey[]) {
      if (gatewayConfig[key].enabled.length === 0) {
        toast.error(`Please enable at least one payment gateway for ${key === 'ID' ? 'Indonesia' : 'Global'}`)
        return
      }
    }
    setSavingGateways(true)
    try {
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
        body: JSON.stringify({
          setting_key: 'payment_gateways',
          setting_value: gatewayConfig,
          reason: 'Updated payment gateway configuration'
        })
      })

      if (response.ok) {
        await fetchSettings()
        toast.success('Payment gateway configuration saved')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save payment gateway configuration')
      }
    } catch (error: any) {
      console.error('Error saving payment gateway config:', error)
      toast.error(error.message || 'Failed to save payment gateway configuration')
    } finally {
      setSavingGateways(false)
    }
  }

  const fetchAuditLog = async () => {
    setLoadingAudit(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast.error('Session expired')
        return
      }

      const response = await fetch('/api/admin/system-settings/audit', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setAuditLogs(data.logs || [])
        setAuditLogOpen(true)
      } else {
        toast.error('Failed to load audit log')
      }
    } catch (error) {
      console.error('Error fetching audit log:', error)
      toast.error('Failed to load audit log')
    } finally {
      setLoadingAudit(false)
    }
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
    },
    {
      key: 'dhl_auto_pickup',
      icon: Truck,
      title: 'DHL Auto-Pickup',
      description: 'Automatically request DHL pickup when creating shipments',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      key: 'user_registration_enabled',
      icon: UserPlus,
      title: 'User Registration',
      description: 'Allow new users to create accounts',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    },
    {
      key: 'wishlist_enabled',
      icon: Heart,
      title: 'Wishlist',
      description: 'Allow customers to add products to wishlist',
      color: 'text-pink-600',
      bgColor: 'bg-pink-100'
    },
    {
      key: 'email_notifications_enabled',
      icon: Mail,
      title: 'Email Notifications',
      description: 'Send automated emails to customers (orders, shipping, etc)',
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100'
    },
    {
      key: 'order_notifications_enabled',
      icon: Bell,
      title: 'Order Notifications',
      description: 'Send order status update notifications to customers',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
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

      {/* Payment Gateway Configuration */}
      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div className="flex items-start gap-4 mb-6">
          <div className="rounded-full bg-emerald-100 p-3">
            <CreditCard className="h-6 w-6 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900">Payment Gateway Configuration</h2>
            <p className="mt-1 text-sm text-gray-600">
              Choose which payment gateways are enabled for each region, and which one is used by default at checkout.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {(['ID', 'global'] as PaymentRegionKey[]).map((regionKey) => {
            const regionConfig = gatewayConfig[regionKey]
            return (
              <div key={regionKey} className="rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-3">
                  {regionKey === 'ID' ? '🇮🇩 Indonesia' : '🌍 Global (Rest of World)'}
                </h3>
                <div className="space-y-3">
                  {ALL_GATEWAYS.map((gw) => {
                    const isEnabled = regionConfig.enabled.includes(gw.key)
                    const isDefault = regionConfig.default === gw.key
                    return (
                      <div
                        key={gw.key}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                          isEnabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'
                        }`}
                      >
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={() => toggleGatewayEnabled(regionKey, gw.key)}
                            className="h-4 w-4 rounded border-gray-300 text-luxury-gold focus:ring-luxury-gold"
                          />
                          <span className="text-sm font-medium text-gray-800">{gw.label}</span>
                          {!gw.implemented && (
                            <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-[10px] font-medium text-yellow-700">
                              Coming soon
                            </span>
                          )}
                        </label>
                        <label className={`flex items-center gap-1.5 text-xs ${isEnabled ? 'text-gray-600' : 'text-gray-300'}`}>
                          <input
                            type="radio"
                            name={`default-${regionKey}`}
                            checked={isDefault}
                            disabled={!isEnabled}
                            onChange={() => setGatewayDefault(regionKey, gw.key)}
                            className="h-3.5 w-3.5 border-gray-300 text-luxury-gold focus:ring-luxury-gold disabled:opacity-40"
                          />
                          Default
                        </label>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg bg-blue-50 p-3 border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Orders will use the gateway marked as <strong>Default</strong> for the customer's region. PayPal integration is not yet built; enabling it will fall back to the region's other enabled gateway.
          </p>
          <button
            onClick={saveGatewayConfig}
            disabled={savingGateways}
            className="ml-4 shrink-0 rounded-lg bg-luxury-navy px-4 py-2 text-sm font-medium text-white hover:bg-luxury-navy/90 disabled:opacity-50"
          >
            {savingGateways ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* DHL Pickup Configuration */}
      {settings.dhl_auto_pickup?.setting_value?.enabled && (
        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-start gap-4 mb-6">
            <div className="rounded-full bg-orange-100 p-3">
              <Truck className="h-6 w-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">DHL Pickup Configuration</h2>
              <p className="mt-1 text-sm text-gray-600">
                Configure when and where DHL should pick up packages
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pickup Close Time
              </label>
              <input
                type="time"
                value={settings.dhl_auto_pickup?.setting_value?.closeTime || '18:00'}
                onChange={(e) => {
                  const newValue = {
                    ...settings.dhl_auto_pickup.setting_value,
                    closeTime: e.target.value
                  }
                  updateSetting('dhl_auto_pickup', newValue)
                }}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
              <p className="mt-1 text-xs text-gray-500">
                Latest time DHL can arrive to pick up packages (24-hour format)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pickup Location
              </label>
              <input
                type="text"
                value={settings.dhl_auto_pickup?.setting_value?.location || 'reception'}
                onChange={(e) => {
                  const newValue = {
                    ...settings.dhl_auto_pickup.setting_value,
                    location: e.target.value
                  }
                  updateSetting('dhl_auto_pickup', newValue)
                }}
                maxLength={80}
                placeholder="e.g., reception, warehouse, loading dock"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
              <p className="mt-1 text-xs text-gray-500">
                Where packages will be ready for DHL pickup (max 80 characters)
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-orange-50 p-4 border border-orange-200">
            <p className="text-sm text-orange-800">
              <strong>Current Configuration:</strong> DHL will pick up packages from <strong>{settings.dhl_auto_pickup?.setting_value?.location || 'reception'}</strong> before <strong>{settings.dhl_auto_pickup?.setting_value?.closeTime || '18:00'}</strong> daily.
            </p>
          </div>
        </div>
      )}

      {/* Audit Trail Link */}
      <div className="rounded-lg bg-gray-50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">System Settings Audit Log</h3>
            <p className="mt-1 text-sm text-gray-600">
              View all changes made to system settings
            </p>
          </div>
          <button 
            onClick={fetchAuditLog}
            disabled={loadingAudit}
            className="rounded-lg bg-luxury-navy px-4 py-2 text-sm font-medium text-white hover:bg-luxury-navy/90 disabled:opacity-50"
          >
            {loadingAudit ? 'Loading...' : 'View Audit Log'}
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

      {/* Audit Log Modal */}
      <Dialog open={auditLogOpen} onOpenChange={setAuditLogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>System Settings Audit Log</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {auditLogs.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No audit log entries found</p>
            ) : (
              <div className="space-y-4">
                {auditLogs.map((log) => (
                  <div key={log.id} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {log.setting_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </h4>
                        <p className="text-sm text-gray-600">
                          Changed by: {log.user_email || 'Unknown'}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                      <div>
                        <p className="text-gray-600 font-medium">Old Value:</p>
                        <pre className="mt-1 bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                          {JSON.stringify(log.old_value, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <p className="text-gray-600 font-medium">New Value:</p>
                        <pre className="mt-1 bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                          {JSON.stringify(log.new_value, null, 2)}
                        </pre>
                      </div>
                    </div>
                    {log.reason && (
                      <div className="mt-3 rounded bg-blue-50 p-3 border border-blue-200">
                        <p className="text-sm text-blue-900">
                          <strong>Reason:</strong> {log.reason}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
