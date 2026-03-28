'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { Globe } from 'lucide-react'

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage()

  const handleLanguageChange = (newLocale: 'en' | 'id') => {
    console.log('Language switch clicked:', newLocale)
    setLocale(newLocale)
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 py-2 backdrop-blur-sm">
      <Globe className="h-4 w-4 text-luxury-gold" />
      <div className="flex items-center gap-1">
        <button
          onClick={() => handleLanguageChange('en')}
          className={`px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
            locale === 'en'
              ? 'bg-luxury-gold text-luxury-navy shadow-sm'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          EN
        </button>
        <span className="text-white/30">|</span>
        <button
          onClick={() => handleLanguageChange('id')}
          className={`px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
            locale === 'id'
              ? 'bg-luxury-gold text-luxury-navy shadow-sm'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          ID
        </button>
      </div>
    </div>
  )
}
