'use client'

import { useState, useEffect } from 'react'
import { Globe, ChevronDown } from 'lucide-react'
import { useRegion } from '@/contexts/RegionContext'
import { Region } from '@/lib/types/region'
import { supabase } from '@/lib/supabase/client'
import Image from 'next/image'

const countryFlags: Record<string, string> = {
  'ID': '🇮🇩',  // Indonesia - home country
  'US': '🇺🇸',
  'EU': '🇪🇺',
  'LATAM': '🌎',
  'MENA': '🌎',
  'UK': '🇬🇧',
  'APAC': '🌎',  // Asia Pacific (other countries)
}

export function RegionCurrencySelector() {
  const { region, setRegion } = useRegion()
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
      
      // Sort to show Indonesia first (home country), then alphabetically
      const sortedRegions = (data || []).sort((a: Region, b: Region) => {
        if (a.code === 'ID') return -1
        if (b.code === 'ID') return 1
        return a.name.localeCompare(b.name)
      })
      
      setRegions(sortedRegions)
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

  const currentFlag = countryFlags[region.code] || '🌍'

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-white hover:text-luxury-gold transition-colors"
        disabled={loading}
        aria-label="Select region and currency"
      >
        <Globe className="h-5 w-5" />
        <span className="text-sm font-medium">{region.code}</span>
        <span className="text-lg leading-none">{currentFlag}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-border/40 bg-white shadow-xl">
            <div className="p-3 border-b border-border/40">
              <h3 className="font-semibold text-gray-900 text-sm">Select Region</h3>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {regions.map((r) => {
                const flag = countryFlags[r.code] || '🌍'
                return (
                  <button
                    key={r.id}
                    onClick={() => handleRegionChange(r.code)}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-all ${
                      region.code === r.code 
                        ? 'bg-luxury-gold/10 text-luxury-gold' 
                        : 'hover:bg-gray-50 text-gray-900'
                    }`}
                    disabled={loading}
                  >
                    <span className="text-xl">{flag}</span>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{r.name}</div>
                      <div className="text-xs text-gray-600">{r.currency_symbol} {r.currency_code}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
