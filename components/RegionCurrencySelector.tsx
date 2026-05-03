'use client'

import { useState, useEffect, useCallback } from 'react'
import { Globe, ChevronDown, X } from 'lucide-react'
import { useRegion } from '@/contexts/RegionContext'

// ─── Country data (maps to region for pricing) ────────────────────────────────

type Group = 'all' | 'middle_east' | 'europe' | 'asia_pacific' | 'north_america' | 'africa'

const COUNTRIES = [
  { code: 'GLOBAL', name: 'Global',      flag: '🌐', regionCode: 'ID',   group: 'all'           as Group, googleLang: '' },
  { code: 'US',     name: 'US',          flag: '🇺🇸', regionCode: 'US',   group: 'north_america' as Group, googleLang: '' },
  { code: 'CA',     name: 'Canada',      flag: '🇨🇦', regionCode: 'US',   group: 'north_america' as Group, googleLang: '' },
  { code: 'AE',     name: 'UAE',         flag: '🇦🇪', regionCode: 'MENA', group: 'middle_east'   as Group, googleLang: 'ar' },
  { code: 'QA',     name: 'Qatar',       flag: '🇶🇦', regionCode: 'MENA', group: 'middle_east'   as Group, googleLang: 'ar' },
  { code: 'SA',     name: 'Saudi',       flag: '🇸🇦', regionCode: 'MENA', group: 'middle_east'   as Group, googleLang: 'ar' },
  { code: 'OM',     name: 'Oman',        flag: '🇴🇲', regionCode: 'MENA', group: 'middle_east'   as Group, googleLang: 'ar' },
  { code: 'BH',     name: 'Bahrain',     flag: '🇧🇭', regionCode: 'MENA', group: 'middle_east'   as Group, googleLang: 'ar' },
  { code: 'JO',     name: 'Jordan',      flag: '🇯🇴', regionCode: 'MENA', group: 'middle_east'   as Group, googleLang: 'ar' },
  { code: 'KW',     name: 'Kuwait',      flag: '🇰🇼', regionCode: 'MENA', group: 'middle_east'   as Group, googleLang: 'ar' },
  { code: 'LB',     name: 'Lebanon',     flag: '🇱🇧', regionCode: 'MENA', group: 'middle_east'   as Group, googleLang: 'ar' },
  { code: 'GB',     name: 'UK',          flag: '🇬🇧', regionCode: 'UK',   group: 'europe'        as Group, googleLang: '' },
  { code: 'DE',     name: 'Germany',     flag: '🇩🇪', regionCode: 'EU',   group: 'europe'        as Group, googleLang: 'de' },
  { code: 'FR',     name: 'France',      flag: '🇫🇷', regionCode: 'EU',   group: 'europe'        as Group, googleLang: 'fr' },
  { code: 'IT',     name: 'Italy',       flag: '🇮🇹', regionCode: 'EU',   group: 'europe'        as Group, googleLang: 'it' },
  { code: 'ES',     name: 'Spain',       flag: '🇪🇸', regionCode: 'EU',   group: 'europe'        as Group, googleLang: 'es' },
  { code: 'NL',     name: 'Netherlands', flag: '🇳🇱', regionCode: 'EU',   group: 'europe'        as Group, googleLang: 'nl' },
  { code: 'BE',     name: 'Belgium',     flag: '🇧🇪', regionCode: 'EU',   group: 'europe'        as Group, googleLang: 'nl' },
  { code: 'AT',     name: 'Austria',     flag: '🇦🇹', regionCode: 'EU',   group: 'europe'        as Group, googleLang: 'de' },
  { code: 'PL',     name: 'Poland',      flag: '🇵🇱', regionCode: 'EU',   group: 'europe'        as Group, googleLang: 'pl' },
  { code: 'RO',     name: 'Romania',     flag: '🇷🇴', regionCode: 'EU',   group: 'europe'        as Group, googleLang: 'ro' },
  { code: 'CZ',     name: 'Czech',       flag: '🇨🇿', regionCode: 'EU',   group: 'europe'        as Group, googleLang: 'cs' },
  { code: 'HU',     name: 'Hungary',     flag: '🇭🇺', regionCode: 'EU',   group: 'europe'        as Group, googleLang: 'hu' },
  { code: 'SK',     name: 'Slovakia',    flag: '🇸🇰', regionCode: 'EU',   group: 'europe'        as Group, googleLang: 'sk' },
  { code: 'ID',     name: 'Indonesia',   flag: '🇮🇩', regionCode: 'ID',   group: 'asia_pacific'  as Group, googleLang: 'id' },
  { code: 'IN',     name: 'India',       flag: '🇮🇳', regionCode: 'APAC', group: 'asia_pacific'  as Group, googleLang: 'hi' },
  { code: 'MY',     name: 'Malaysia',    flag: '🇲🇾', regionCode: 'APAC', group: 'asia_pacific'  as Group, googleLang: 'ms' },
  { code: 'PK',     name: 'Pakistan',    flag: '🇵🇰', regionCode: 'APAC', group: 'asia_pacific'  as Group, googleLang: 'ur' },
  { code: 'SG',     name: 'Singapore',   flag: '��', regionCode: 'APAC', group: 'asia_pacific'  as Group, googleLang: '' },
  { code: 'AU',     name: 'Australia',   flag: '🇦🇺', regionCode: 'APAC', group: 'asia_pacific'  as Group, googleLang: '' },
  { code: 'EG',     name: 'Egypt',       flag: '🇪🇬', regionCode: 'MENA', group: 'africa'        as Group, googleLang: 'ar' },
  { code: 'NG',     name: 'Nigeria',     flag: '��', regionCode: 'MENA', group: 'africa'        as Group, googleLang: '' },
  { code: 'ZA',     name: 'S. Africa',   flag: '🇿🇦', regionCode: 'MENA', group: 'africa'        as Group, googleLang: '' },
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

export function RegionCurrencySelector() {
  const { setRegion, detectionResult, isLoading: regionLoading } = useRegion()
  const [isOpen, setIsOpen]       = useState(false)
  const [activeTab, setActiveTab] = useState<Group | 'all'>('all')
  const [selected, setSelected]   = useState(COUNTRIES[0])
  const [saving, setSaving]       = useState(false)

  // Hydrate: localStorage → IP detection fallback
  useEffect(() => {
    const saved = localStorage.getItem(COUNTRY_KEY)
    if (saved) {
      const found = COUNTRIES.find(c => c.code === saved)
      if (found) { setSelected(found); return }
    }
    if (detectionResult?.country_code) {
      const detected = COUNTRIES.find(c => c.code === detectionResult.country_code)
      if (detected) {
        setSelected(detected)
        localStorage.setItem(COUNTRY_KEY, detected.code)
      }
    }
  }, [detectionResult])

  // Escape key
  useEffect(() => {
    if (!isOpen) return
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false) }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [isOpen])

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const handleSelect = useCallback(async (country: typeof COUNTRIES[number]) => {
    setSaving(true)
    setSelected(country)
    localStorage.setItem(COUNTRY_KEY, country.code)
    // Store target language so the inline script sets <html lang> on next load
    if (country.googleLang) {
      localStorage.setItem('page_lang', country.googleLang)
    } else {
      localStorage.removeItem('page_lang')
    }
    await setRegion(country.regionCode)
    setSaving(false)
    setIsOpen(false)
    // Reload so Chrome detects the new <html lang> and shows its translate bubble
    if (country.googleLang) {
      window.location.reload()
    }
  }, [setRegion])

  const visible = activeTab === 'all'
    ? COUNTRIES
    : COUNTRIES.filter(c => c.group === activeTab)

  if (regionLoading) {
    return (
      <div className="flex items-center gap-1.5 text-white/50">
        <Globe className="h-4 w-4 animate-pulse" />
        <span className="text-sm">...</span>
      </div>
    )
  }

  return (
    <>
      {/* ── Trigger button ── */}
      <button
        onClick={() => setIsOpen(true)}
        disabled={saving}
        aria-label="Select shipping country"
        className="flex items-center gap-1.5 text-white hover:text-luxury-gold transition-colors"
      >
        <Globe className="h-4 w-4 flex-shrink-0" />
        <span className="text-sm font-medium">{selected.code}</span>
        <span className="text-base leading-none">{selected.flag}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </button>

      {/* ── Modal ── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Select your shipping country"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel — bottom-sheet on mobile, wide card on desktop */}
          <div className="relative z-10 w-full max-h-[90vh] rounded-t-2xl sm:rounded-2xl sm:max-w-3xl bg-white shadow-2xl flex flex-col">
            {/* Drag handle — mobile only */}
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>
            {/* Header */}
            <div className="flex items-start justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
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

            {/* Tabs */}
            <div className="border-b border-gray-200 px-4 sm:px-6 overflow-x-auto">
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
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                {visible.map(country => {
                  const isSelected = selected.code === country.code
                  return (
                    <button
                      key={country.code}
                      onClick={() => handleSelect(country)}
                      disabled={saving}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-3 text-left transition-all active:scale-95 min-w-0 ${
                        isSelected
                          ? 'bg-gray-100 ring-2 ring-gray-900'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-xl leading-none flex-shrink-0">{country.flag}</span>
                      <span className="text-[11px] font-bold text-gray-800 uppercase tracking-wide whitespace-nowrap">
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
