'use client'

import { useLanguage } from '@/contexts/LanguageContext'

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage()

  const handleLanguageChange = (newLocale: 'en' | 'id') => {
    console.log('Language switch clicked:', newLocale)
    setLocale(newLocale)
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white p-1">
      <button
        onClick={() => handleLanguageChange('en')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          locale === 'en'
            ? 'bg-luxury-gold text-white shadow-sm'
            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => handleLanguageChange('id')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          locale === 'id'
            ? 'bg-luxury-gold text-white shadow-sm'
            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
        }`}
      >
        ID
      </button>
    </div>
  )
}
