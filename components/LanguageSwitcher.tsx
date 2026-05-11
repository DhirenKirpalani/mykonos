'use client'

import { useState, useEffect } from 'react'
import { Globe } from 'lucide-react'

// Maps country code → Google Translate language code
const COUNTRY_LANG: Record<string, string> = {
  'AE': 'ar', 'QA': 'ar', 'SA': 'ar', 'OM': 'ar',
  'BH': 'ar', 'JO': 'ar', 'KW': 'ar', 'LB': 'ar', 'EG': 'ar',
  'DE': 'de', 'AT': 'de',
  'FR': 'fr',
  'IT': 'it',
  'ES': 'es',
  'NL': 'nl', 'BE': 'nl',
  'PL': 'pl',
  'RO': 'ro',
  'CZ': 'cs',
  'HU': 'hu',
  'SK': 'sk',
  'ID': 'id',
  'IN': 'hi',
  'MY': 'ms',
  'PK': 'ur',
}

const LANG_LABELS: Record<string, string> = {
  'ar': 'AR', 'de': 'DE', 'fr': 'FR', 'it': 'IT', 'es': 'ES',
  'nl': 'NL', 'pl': 'PL', 'ro': 'RO', 'cs': 'CS', 'hu': 'HU',
  'sk': 'SK', 'id': 'ID', 'hi': 'HI', 'ms': 'MS', 'ur': 'UR',
}

function getActiveGoogTrans(): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(/googtrans=([^;]+)/)
  if (!match) return ''
  const parts = decodeURIComponent(match[1]).split('/')
  return parts[2] || ''
}

function applyTranslation(lang: string) {
  const host = window.location.hostname
  if (lang) {
    document.cookie = `googtrans=/en/${lang};path=/;domain=.${host}`
    document.cookie = `googtrans=/en/${lang};path=/`
  } else {
    const exp = 'expires=Thu, 01 Jan 1970 00:00:00 GMT'
    document.cookie = `googtrans=;path=/;domain=.${host};${exp}`
    document.cookie = `googtrans=;path=/;${exp}`
  }
  window.location.reload()
}

export function LanguageSwitcher() {
  const [activeLang, setActiveLang] = useState<string>('')
  const [foreignLang, setForeignLang] = useState<string>('')

  useEffect(() => {
    setActiveLang(getActiveGoogTrans())
    const countryCode = localStorage.getItem('selected_country_code') || ''
    setForeignLang(COUNTRY_LANG[countryCode] || '')
  }, [])

  const foreignLabel = foreignLang ? (LANG_LABELS[foreignLang] ?? foreignLang.toUpperCase()) : ''

  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 py-2 backdrop-blur-sm">
      <Globe className="h-4 w-4 text-luxury-gold" />
      <div className="flex items-center gap-1">
        <button
          onClick={() => applyTranslation('')}
          className={`px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
            !activeLang
              ? 'bg-luxury-gold text-luxury-navy shadow-sm'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          EN
        </button>
        {foreignLabel && (
          <>
            <span className="text-white/30">|</span>
            <button
              onClick={() => applyTranslation(foreignLang)}
              className={`px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
                activeLang === foreignLang
                  ? 'bg-luxury-gold text-luxury-navy shadow-sm'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              {foreignLabel}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
