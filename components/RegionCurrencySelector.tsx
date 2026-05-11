'use client'

import { useState, useEffect, useCallback } from 'react'
import { Globe, ChevronDown, X, Languages } from 'lucide-react'
import { useRegion } from '@/contexts/RegionContext'

// ─── Country data (maps to region for pricing) ────────────────────────────────

type Group = 'all' | 'middle_east' | 'europe' | 'asia_pacific' | 'north_america' | 'africa'

const COUNTRIES = [
  { code: 'GLOBAL', name: 'Global',      flag: '🌐', regionCode: 'US',   group: 'all'           as Group, googleLang: '' },
  { code: 'US',     name: 'US',          flag: '🇺🇸', regionCode: 'US',   group: 'north_america' as Group, googleLang: '' },
  { code: 'CA',     name: 'Canada',      flag: '🇨🇦', regionCode: 'CA',   group: 'north_america' as Group, googleLang: '' },
  { code: 'MX',     name: 'Mexico',      flag: '🇲🇽', regionCode: 'MX',   group: 'north_america' as Group, googleLang: 'es' },
  { code: 'AE',     name: 'UAE',         flag: '🇦🇪', regionCode: 'AE',   group: 'middle_east'   as Group, googleLang: 'ar' },
  { code: 'QA',     name: 'Qatar',       flag: '🇶🇦', regionCode: 'QA',   group: 'middle_east'   as Group, googleLang: 'ar' },
  { code: 'SA',     name: 'Saudi',       flag: '🇸🇦', regionCode: 'SA',   group: 'middle_east'   as Group, googleLang: 'ar' },
  { code: 'OM',     name: 'Oman',        flag: '🇴🇲', regionCode: 'OM',   group: 'middle_east'   as Group, googleLang: 'ar' },
  { code: 'BH',     name: 'Bahrain',     flag: '🇧🇭', regionCode: 'BH',   group: 'middle_east'   as Group, googleLang: 'ar' },
  { code: 'JO',     name: 'Jordan',      flag: '🇯🇴', regionCode: 'JO',   group: 'middle_east'   as Group, googleLang: 'ar' },
  { code: 'KW',     name: 'Kuwait',      flag: '🇰🇼', regionCode: 'KW',   group: 'middle_east'   as Group, googleLang: 'ar' },
  { code: 'LB',     name: 'Lebanon',     flag: '🇱🇧', regionCode: 'LB',   group: 'middle_east'   as Group, googleLang: 'ar' },
  { code: 'IL',     name: 'Israel',      flag: '🇮🇱', regionCode: 'IL',   group: 'middle_east'   as Group, googleLang: 'he' },
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
  { code: 'CH',     name: 'Switzerland', flag: '🇨🇭', regionCode: 'CH',   group: 'europe'        as Group, googleLang: 'de' },
  { code: 'NO',     name: 'Norway',      flag: '🇳🇴', regionCode: 'NO',   group: 'europe'        as Group, googleLang: 'no' },
  { code: 'SE',     name: 'Sweden',      flag: '🇸🇪', regionCode: 'SE',   group: 'europe'        as Group, googleLang: 'sv' },
  { code: 'DK',     name: 'Denmark',     flag: '🇩🇰', regionCode: 'DK',   group: 'europe'        as Group, googleLang: 'da' },
  { code: 'TR',     name: 'Turkey',      flag: '🇹🇷', regionCode: 'TR',   group: 'europe'        as Group, googleLang: 'tr' },
  { code: 'ID',     name: 'Indonesia',   flag: '🇮🇩', regionCode: 'ID',   group: 'asia_pacific'  as Group, googleLang: 'id' },
  { code: 'IN',     name: 'India',       flag: '🇮🇳', regionCode: 'IN',   group: 'asia_pacific'  as Group, googleLang: 'hi' },
  { code: 'MY',     name: 'Malaysia',    flag: '🇲🇾', regionCode: 'MY',   group: 'asia_pacific'  as Group, googleLang: 'ms' },
  { code: 'PK',     name: 'Pakistan',    flag: '🇵🇰', regionCode: 'PK',   group: 'asia_pacific'  as Group, googleLang: 'ur' },
  { code: 'SG',     name: 'Singapore',   flag: '🇸🇬', regionCode: 'SG',   group: 'asia_pacific'  as Group, googleLang: '' },
  { code: 'AU',     name: 'Australia',   flag: '🇦🇺', regionCode: 'AU',   group: 'asia_pacific'  as Group, googleLang: '' },
  { code: 'NZ',     name: 'New Zealand', flag: '🇳🇿', regionCode: 'NZ',   group: 'asia_pacific'  as Group, googleLang: '' },
  { code: 'TH',     name: 'Thailand',    flag: '🇹🇭', regionCode: 'TH',   group: 'asia_pacific'  as Group, googleLang: 'th' },
  { code: 'PH',     name: 'Philippines', flag: '🇵🇭', regionCode: 'PH',   group: 'asia_pacific'  as Group, googleLang: 'tl' },
  { code: 'JP',     name: 'Japan',       flag: '🇯🇵', regionCode: 'JP',   group: 'asia_pacific'  as Group, googleLang: 'ja' },
  { code: 'KR',     name: 'South Korea', flag: '🇰🇷', regionCode: 'KR',   group: 'asia_pacific'  as Group, googleLang: 'ko' },
  { code: 'HK',     name: 'Hong Kong',   flag: '🇭🇰', regionCode: 'HK',   group: 'asia_pacific'  as Group, googleLang: 'zh' },
  { code: 'TW',     name: 'Taiwan',      flag: '🇹🇼', regionCode: 'TW',   group: 'asia_pacific'  as Group, googleLang: 'zh' },
  { code: 'VN',     name: 'Vietnam',     flag: '🇻🇳', regionCode: 'VN',   group: 'asia_pacific'  as Group, googleLang: 'vi' },
  { code: 'EG',     name: 'Egypt',       flag: '🇪🇬', regionCode: 'EG',   group: 'africa'        as Group, googleLang: 'ar' },
  { code: 'NG',     name: 'Nigeria',     flag: '🇳🇬', regionCode: 'NG',   group: 'africa'        as Group, googleLang: '' },
  { code: 'ZA',     name: 'S. Africa',   flag: '🇿🇦', regionCode: 'ZA',   group: 'africa'        as Group, googleLang: '' },
  { code: 'BR',     name: 'Brazil',      flag: '🇧🇷', regionCode: 'BR',   group: 'north_america' as Group, googleLang: 'pt' },
  { code: 'AR',     name: 'Argentina',   flag: '🇦🇷', regionCode: 'AR',   group: 'north_america' as Group, googleLang: 'es' },
  { code: 'CL',     name: 'Chile',       flag: '🇨🇱', regionCode: 'CL',   group: 'north_america' as Group, googleLang: 'es' },
  { code: 'CO',     name: 'Colombia',    flag: '🇨🇴', regionCode: 'CO',   group: 'north_america' as Group, googleLang: 'es' },
]

const LANG_NAMES: Record<string, { native: string }> = {
  'ar': { native: 'العربية' },
  'de': { native: 'Deutsch' },
  'fr': { native: 'Français' },
  'it': { native: 'Italiano' },
  'es': { native: 'Español' },
  'nl': { native: 'Nederlands' },
  'pl': { native: 'Polski' },
  'ro': { native: 'Română' },
  'cs': { native: 'Čeština' },
  'hu': { native: 'Magyar' },
  'sk': { native: 'Slovenčina' },
  'id': { native: 'Bahasa Indonesia' },
  'hi': { native: 'हिन्दी' },
  'ms': { native: 'Bahasa Melayu' },
  'ur': { native: 'اردو' },
}

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
  const [currentLang, setCurrentLang] = useState<string>('')

  // Hydrate: localStorage → IP detection fallback
  useEffect(() => {
    const pageLang = localStorage.getItem('page_lang') || ''
    setCurrentLang(pageLang)

    const saved = localStorage.getItem(COUNTRY_KEY)
    if (saved) {
      const found = COUNTRIES.find(c => c.code === saved)
      if (found) { setSelected(found) }
    }

    if (detectionResult?.country_code) {
      const detected = COUNTRIES.find(c => c.code === detectionResult.country_code)
      if (detected) {
        if (!saved) {
          setSelected(detected)
          localStorage.setItem(COUNTRY_KEY, detected.code)
        }

        // Auto-trigger Google Translate on first IP-detected visit
        const alreadyChecked = localStorage.getItem('auto_translate_checked')
        if (!alreadyChecked && detected.googleLang && detectionResult.source === 'ip_geolocation') {
          localStorage.setItem('auto_translate_checked', 'true')
          localStorage.setItem('page_lang', detected.googleLang)
          window.location.reload()
        } else if (!alreadyChecked) {
          localStorage.setItem('auto_translate_checked', 'true')
        }
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
    const prevLang = localStorage.getItem('page_lang') || ''
    if (country.googleLang) {
      localStorage.setItem('page_lang', country.googleLang)
    } else {
      localStorage.removeItem('page_lang')
    }
    await setRegion(country.regionCode)
    setSaving(false)
    setIsOpen(false)
    // Always reload to update currency and language
    window.location.reload()
  }, [setRegion])

  const setLanguage = useCallback((lang: string) => {
    if (lang) {
      localStorage.setItem('page_lang', lang)
    } else {
      localStorage.removeItem('page_lang')
    }
    window.location.reload()
  }, [])

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

          {/* Panel — bottom-sheet on mobile, compact card on desktop */}
          <div className="relative z-10 w-full rounded-t-2xl sm:rounded-xl sm:max-w-3xl bg-white shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh]">
            {/* Drag handle — mobile only */}
            <div className="sm:hidden flex justify-center pt-3 pb-1 cursor-grab">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 pt-2 sm:pt-4 pb-2 sm:pb-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Select shipping country</h2>
                <p className="hidden sm:block mt-0.5 text-xs text-gray-500">Choose your location for pricing and delivery</p>
                {/* Language toggle — shown when country has a non-English language */}
                {selected.googleLang && (
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <Languages className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-xs text-gray-500">Page language:</span>
                    <button
                      onClick={() => setLanguage(selected.googleLang)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        currentLang === selected.googleLang
                          ? 'bg-luxury-gold text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {LANG_NAMES[selected.googleLang]?.native ?? selected.googleLang}
                    </button>
                    <button
                      onClick={() => setLanguage('')}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        !currentLang
                          ? 'bg-luxury-gold text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      English
                    </button>
                  </div>
                )}
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
            <div className="border-b border-gray-200 px-4 sm:px-5 overflow-x-auto scrollbar-hide">
              <div className="flex gap-0 min-w-max">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-2.5 sm:px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
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
            <div className="overflow-y-auto flex-1 p-3 sm:p-4">
              <div className="grid grid-cols-3 sm:grid-cols-7 gap-1.5 sm:gap-2">
                {visible.map(country => {
                  const isSelected = selected.code === country.code
                  return (
                    <button
                      key={country.code}
                      onClick={() => handleSelect(country)}
                      disabled={saving}
                      className={`flex flex-col items-center gap-0.5 sm:gap-1 rounded-lg px-1.5 py-2 sm:py-2.5 text-center transition-all active:scale-95 min-w-0 ${
                        isSelected
                          ? 'bg-gray-100 ring-2 ring-gray-900'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-xl sm:text-2xl leading-none">{country.flag}</span>
                      <span className="text-[9px] sm:text-[10px] font-semibold text-gray-800 uppercase tracking-wide leading-tight mt-0.5">
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
