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
  const { region, setRegion, isLoading: regionLoading } = useRegion()
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

  if (!region || regionLoading) {
    return (
      <div className="flex items-center gap-2 text-white/50">
        <Globe className="h-5 w-5 animate-pulse" />
        <span className="text-sm">...</span>
      </div>
    )
  }

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
            className="fixed inset-0 z-[60] bg-black/20"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-[70] sm:absolute sm:left-0 sm:right-auto sm:top-full sm:translate-y-0 sm:mt-2 sm:w-80 md:w-96 rounded-lg border border-border/40 bg-white shadow-2xl max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-border/40 bg-gray-50">
              <h3 className="font-semibold text-gray-900 text-base">Select Region</h3>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {regions.map((r) => {
                const flag = countryFlags[r.code] || '🌍'
                return (
                  <button
                    key={r.id}
                    onClick={() => handleRegionChange(r.code)}
                    className={`flex w-full items-center gap-3 rounded-md px-4 py-3 text-left transition-all ${
                      region.code === r.code 
                        ? 'bg-luxury-gold/10 text-luxury-gold border-2 border-luxury-gold' 
                        : 'hover:bg-gray-50 text-gray-900 border-2 border-transparent'
                    }`}
                    disabled={loading}
                  >
                    <span className="text-2xl">{flag}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm md:text-base truncate">{r.name}</div>
                      <div className="text-xs md:text-sm text-gray-600">{r.currency_symbol} {r.currency_code}</div>
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
