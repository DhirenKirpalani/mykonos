'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { Globe } from 'lucide-react'

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage()

  return (
    <div className="relative">
      <button
        onClick={() => setLocale(locale === 'en' ? 'id' : 'en')}
        className="flex h-10 w-10 items-center justify-center rounded-lg transition-all hover:bg-white/10 active:scale-95"
        aria-label="Switch language"
      >
        <Globe className="h-5 w-5" />
      </button>
      <span className="absolute -bottom-1 -right-1 rounded-full bg-luxury-gold px-1.5 py-0.5 text-[10px] font-medium text-white">
        {locale.toUpperCase()}
      </span>
    </div>
  )
}
