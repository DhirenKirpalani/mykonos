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
  
  // Initialize with saved, detected, or default country
  const getInitialCountry = () => {
    if (typeof window === 'undefined') return COUNTRIES[0]
    
    const saved = localStorage.getItem(COUNTRY_KEY)
    if (saved) {
      const found = COUNTRIES.find(c => c.code === saved)
      if (found) return found
    }
    
    // Use detected country if available
    if (detectionResult?.country_code) {
      const detected = COUNTRIES.find(c => c.code === detectionResult.country_code)
      if (detected) return detected
    }
    
    return COUNTRIES[0]
  }
  
  const [selected, setSelected]   = useState(getInitialCountry)
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
    <div
      className="flex items-center gap-1.5 text-white/80"
      title={`Detected region: ${selected.name}`}
    >
      <Globe className="h-4 w-4 flex-shrink-0" />
      <span className="text-sm font-medium">{selected.code}</span>
      <span className="text-base leading-none">{selected.flag}</span>
    </div>
  )
}
