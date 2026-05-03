'use client'

import { useState, useEffect, useCallback } from 'react'
import { Globe, ChevronDown, X } from 'lucide-react'
import { useRegion } from '@/contexts/RegionContext'

// ─── Data ────────────────────────────────────────────────────────────────────

type Group = 'all' | 'middle_east' | 'europe' | 'asia_pacific' | 'north_america' | 'africa'

interface Country {
  code: string
  name: string
  flag: string
  regionCode: string
  group: Group
}

const COUNTRIES: Country[] = [
  { code: 'GLOBAL', name: 'Global',      flag: '🌐', regionCode: 'ID',   group: 'all' },
  // North America
  { code: 'US',     name: 'US',          flag: '🇺🇸', regionCode: 'US',   group: 'north_america' },
  { code: 'CA',     name: 'Canada',      flag: '🇨🇦', regionCode: 'US',   group: 'north_america' },
  // Middle East
  { code: 'AE',     name: 'UAE',         flag: '🇦🇪', regionCode: 'MENA', group: 'middle_east' },
  { code: 'QA',     name: 'Qatar',       flag: '🇶🇦', regionCode: 'MENA', group: 'middle_east' },
  { code: 'SA',     name: 'Saudi',       flag: '🇸🇦', regionCode: 'MENA', group: 'middle_east' },
  { code: 'OM',     name: 'Oman',        flag: '🇴🇲', regionCode: 'MENA', group: 'middle_east' },
  { code: 'BH',     name: 'Bahrain',     flag: '🇧🇭', regionCode: 'MENA', group: 'middle_east' },
  { code: 'JO',     name: 'Jordan',      flag: '🇯🇴', regionCode: 'MENA', group: 'middle_east' },
  { code: 'KW',     name: 'Kuwait',      flag: '🇰🇼', regionCode: 'MENA', group: 'middle_east' },
  { code: 'LB',     name: 'Lebanon',     flag: '🇱🇧', regionCode: 'MENA', group: 'middle_east' },
  // Europe
  { code: 'GB',     name: 'UK',          flag: '🇬🇧', regionCode: 'UK',   group: 'europe' },
  { code: 'DE',     name: 'Germany',     flag: '🇩🇪', regionCode: 'EU',   group: 'europe' },
  { code: 'FR',     name: 'France',      flag: '🇫🇷', regionCode: 'EU',   group: 'europe' },
  { code: 'IT',     name: 'Italy',       flag: '🇮🇹', regionCode: 'EU',   group: 'europe' },
  { code: 'ES',     name: 'Spain',       flag: '🇪🇸', regionCode: 'EU',   group: 'europe' },
  { code: 'NL',     name: 'Netherlands', flag: '🇳🇱', regionCode: 'EU',   group: 'europe' },
  { code: 'BE',     name: 'Belgium',     flag: '🇧🇪', regionCode: 'EU',   group: 'europe' },
  { code: 'AT',     name: 'Austria',     flag: '🇦🇹', regionCode: 'EU',   group: 'europe' },
  { code: 'PL',     name: 'Poland',      flag: '🇵🇱', regionCode: 'EU',   group: 'europe' },
  { code: 'RO',     name: 'Romania',     flag: '🇷🇴', regionCode: 'EU',   group: 'europe' },
  { code: 'CZ',     name: 'Czech',       flag: '🇨🇿', regionCode: 'EU',   group: 'europe' },
  { code: 'HU',     name: 'Hungary',     flag: '🇭🇺', regionCode: 'EU',   group: 'europe' },
  { code: 'SK',     name: 'Slovakia',    flag: '🇸🇰', regionCode: 'EU',   group: 'europe' },
  // Asia/Pacific
  { code: 'ID',     name: 'Indonesia',   flag: '🇮🇩', regionCode: 'ID',   group: 'asia_pacific' },
  { code: 'IN',     name: 'India',       flag: '🇮🇳', regionCode: 'APAC', group: 'asia_pacific' },
  { code: 'MY',     name: 'Malaysia',    flag: '🇲🇾', regionCode: 'APAC', group: 'asia_pacific' },
  { code: 'PK',     name: 'Pakistan',    flag: '🇵🇰', regionCode: 'APAC', group: 'asia_pacific' },
  { code: 'SG',     name: 'Singapore',   flag: '🇸🇬', regionCode: 'APAC', group: 'asia_pacific' },
  { code: 'AU',     name: 'Australia',   flag: '🇦🇺', regionCode: 'APAC', group: 'asia_pacific' },
  // Africa
  { code: 'EG',     name: 'Egypt',       flag: '🇪🇬', regionCode: 'MENA', group: 'africa' },
  { code: 'NG',     name: 'Nigeria',     flag: '🇳🇬', regionCode: 'MENA', group: 'africa' },
  { code: 'ZA',     name: 'S. Africa',   flag: '🇿🇦', regionCode: 'MENA', group: 'africa' },
]

const TABS: { id: Group | 'all'; label: string }[] = [
  { id: 'all',           label: 'All' },
  { id: 'middle_east',   label: 'Middle East' },
  { id: 'europe',        label: 'Europe' },
  { id: 'asia_pacific',  label: 'Asia/Pacific' },
  { id: 'north_america', label: 'North America' },
  { id: 'africa',        label: 'Africa' },
]

const COUNTRY_KEY = 'selected_country_code'

// ─── Component ───────────────────────────────────────────────────────────────

export function CountrySelector() {
  const { setRegion, isLoading: regionLoading } = useRegion()
  const [isOpen, setIsOpen]         = useState(false)
  const [activeTab, setActiveTab]   = useState<Group | 'all'>('all')
  const [selected, setSelected]     = useState<Country>(COUNTRIES[0])
  const [saving, setSaving]         = useState(false)

  // Hydrate from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(COUNTRY_KEY)
    if (saved) {
      const found = COUNTRIES.find(c => c.code === saved)
      if (found) setSelected(found)
    }
  }, [])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen])

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const handleSelect = useCallback(async (country: Country) => {
    setSaving(true)
    setSelected(country)
    localStorage.setItem(COUNTRY_KEY, country.code)
    await setRegion(country.regionCode)
    setSaving(false)
    setIsOpen(false)
  }, [setRegion])

  const visible = activeTab === 'all'
    ? COUNTRIES
    : COUNTRIES.filter(c => c.group === activeTab)

  return (
    <>
      {/* ── Trigger button ── */}
      <button
        onClick={() => setIsOpen(true)}
        disabled={regionLoading || saving}
        aria-label="Select shipping country"
        className="flex items-center gap-1.5 text-white hover:text-luxury-gold transition-colors"
      >
        <Globe className="h-4 w-4 flex-shrink-0" />
        <span className="text-sm font-medium">{selected.code}</span>
        <span className="text-base leading-none">{selected.flag}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </button>

      {/* ── Modal overlay ── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-stretch sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Select your shipping country"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel — full-screen on mobile, centered card on desktop */}
          <div className="relative z-10 w-full h-full sm:h-auto sm:max-w-2xl bg-white sm:rounded-2xl shadow-2xl sm:max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-6 pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Select your shipping country</h2>
                <p className="mt-1 text-sm text-gray-500">Choose your location to see products and delivery options for your region.</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="ml-4 mt-0.5 flex-shrink-0 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Region tabs */}
            <div className="border-b border-gray-200 px-6 overflow-x-auto">
              <div className="flex gap-0 min-w-max">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-gray-900 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Country grid */}
            <div className="overflow-y-auto flex-1 p-4">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                {visible.map(country => {
                  const isSelected = selected.code === country.code
                  return (
                    <button
                      key={country.code}
                      onClick={() => handleSelect(country)}
                      disabled={saving}
                      className={`flex items-center gap-2 rounded-lg px-2.5 py-3 text-left transition-all active:scale-95 ${
                        isSelected
                          ? 'bg-gray-100 ring-2 ring-gray-900'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-lg leading-none flex-shrink-0">{country.flag}</span>
                      <span className="text-[10px] font-bold text-gray-800 uppercase tracking-wide leading-tight break-words min-w-0">
                        {country.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
