'use client'

import { useLanguage } from '@/contexts/LanguageContext'

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage()

  const handleLanguageChange = (newLocale: 'en' | 'id') => {
    console.log('Language switch clicked:', newLocale)
    setLocale(newLocale)
  }

  return (
    <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1">
      <button
        onClick={() => handleLanguageChange('en')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          locale === 'en'
            ? 'bg-luxury-gold text-luxury-navy'
            : 'text-white/70 hover:text-white hover:bg-white/10'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => handleLanguageChange('id')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          locale === 'id'
            ? 'bg-luxury-gold text-luxury-navy'
            : 'text-white/70 hover:text-white hover:bg-white/10'
        }`}
      >
        ID
      </button>
    </div>
  )
}
