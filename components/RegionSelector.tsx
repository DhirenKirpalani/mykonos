'use client'

import { useState, useEffect } from 'react'
import { Globe, Check, ChevronDown } from 'lucide-react'
import { useRegion } from '@/contexts/RegionContext'
import { Region } from '@/lib/types/region'
import { supabase } from '@/lib/supabase/client'

export function RegionSelector() {
  const { region, setRegion, detectionResult } = useRegion()
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

  if (!region) return null

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-md border border-border/40 bg-white px-3 py-2 text-sm transition-colors hover:bg-luxury-gray-light"
        disabled={loading}
      >
        <Globe className="h-4 w-4" />
        <span className="font-medium">{region.currency_symbol}</span>
        <span className="text-muted-foreground">{region.currency_code}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-border/40 bg-white shadow-lg">
            <div className="p-3 border-b border-border/40">
              <h3 className="font-medium">Select Region</h3>
              {detectionResult && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {detectionResult.source === 'user_profile' && 'Based on your profile'}
                  {detectionResult.source === 'shipping_address' && 'Based on your address'}
                  {detectionResult.source === 'ip_geolocation' && 'Detected from your location'}
                  {detectionResult.source === 'default' && 'Default region'}
                </p>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto p-2">
              {regions.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleRegionChange(r.code)}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-luxury-gray-light ${
                    region.code === r.code ? 'bg-luxury-gold/10' : ''
                  }`}
                  disabled={loading}
                >
                  <div>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.currency_symbol} {r.currency_code}
                    </div>
                  </div>
                  {region.code === r.code && (
                    <Check className="h-4 w-4 text-luxury-gold" />
                  )}
                </button>
              ))}
            </div>
            {detectionResult?.country_region && !detectionResult.country_region.is_shipping_available && (
              <div className="border-t border-border/40 bg-amber-50 p-3">
                <p className="text-xs text-amber-800">
                  <strong>Note:</strong> Shipping is not available to your detected location.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
