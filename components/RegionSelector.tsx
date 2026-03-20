'use client'

import { useState, useEffect } from 'react'
import { Globe, Check, ChevronDown, X } from 'lucide-react'
import { useRegion } from '@/contexts/RegionContext'
import { Region } from '@/lib/types/region'
import { supabase } from '@/lib/supabase/client'

export function RegionSelector() {
  const { region, setRegion, detectionResult, isLoading: regionLoading } = useRegion()
  const [isOpen, setIsOpen] = useState(false)
  const [regions, setRegions] = useState<Region[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchRegions()
  }, [])

  const fetchRegions = async () => {
    try {
      const { data, error } = await supabase
        .from('regions')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setRegions(data || [])
    } catch (error) {
      console.error('Failed to fetch regions:', error)
    }
  }

  const handleRegionChange = async (regionCode: string) => {
    setLoading(true)
    await setRegion(regionCode)
    setLoading(false)
    setIsOpen(false)
  }

  if (!region || regionLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white/50">
        <Globe className="h-4 w-4 animate-pulse" />
        <span>Loading...</span>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white transition-all hover:bg-white/20 active:scale-95"
        disabled={loading}
      >
        <Globe className="h-4 w-4" />
        <span className="font-medium">{region.currency_symbol}</span>
        <span className="opacity-80">{region.currency_code}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border border-border/40 bg-white shadow-xl">
            <div className="p-4 border-b border-border/40 bg-gray-50 relative">
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-3 right-3 rounded-full p-1 hover:bg-gray-200 transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4 text-gray-600" />
              </button>
              <h3 className="font-semibold text-gray-900 text-base pr-8">Select Your Region</h3>
              {detectionResult && (
                <p className="mt-1 text-xs text-gray-600">
                  {detectionResult.source === 'user_profile' && '✓ Based on your profile'}
                  {detectionResult.source === 'shipping_address' && '✓ Based on your address'}
                  {detectionResult.source === 'ip_geolocation' && '📍 Detected from your location'}
                  {detectionResult.source === 'default' && 'Default region'}
                </p>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {regions.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleRegionChange(r.code)}
                  className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-left transition-all ${
                    region.code === r.code 
                      ? 'bg-luxury-gold/15 border-2 border-luxury-gold' 
                      : 'hover:bg-gray-50 border-2 border-transparent'
                  }`}
                  disabled={loading}
                >
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 text-base mb-1">{r.name}</div>
                    <div className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="font-medium">{r.currency_symbol} {r.currency_code}</span>
                      {r.tax_rate > 0 && (
                        <span className="text-xs text-gray-500">• {r.tax_rate}% tax</span>
                      )}
                    </div>
                  </div>
                  {region.code === r.code && (
                    <Check className="h-5 w-5 text-luxury-gold flex-shrink-0 ml-2" />
                  )}
                </button>
              ))}
            </div>
            {detectionResult?.country_region && !detectionResult.country_region.is_shipping_available && (
              <div className="border-t border-border/40 bg-amber-50 p-4">
                <p className="text-sm text-amber-900 font-medium">
                  ⚠️ Shipping unavailable to your detected location
                </p>
              </div>
            )}
            <div className="border-t border-border/40 p-3 bg-gray-50">
              <p className="text-xs text-gray-600 text-center">
                Prices and shipping options will update based on your selection
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
