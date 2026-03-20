'use client'

import React, { createContext, useContext, useState } from 'react'
import { translations } from '@/lib/translations'

export type Locale = 'en' | 'id'

type LanguageContextType = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: any
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Always start with 'en' to match server-side rendering
  const [locale, setLocaleState] = useState<Locale>('en')
  const [mounted, setMounted] = useState(false)

  // Load saved locale from localStorage after mount to prevent hydration mismatch
  React.useEffect(() => {
    setMounted(true)
    const savedLocale = localStorage.getItem('locale') as Locale
    if (savedLocale && (savedLocale === 'en' || savedLocale === 'id')) {
      setLocaleState(savedLocale)
    }
  }, [])

  const setLocale = (newLocale: Locale) => {
    console.log('LanguageContext setLocale called:', newLocale)
    console.log('Current locale before update:', locale)
    setLocaleState(newLocale)
    localStorage.setItem('locale', newLocale)
    console.log('Locale state updated to:', newLocale)
    console.log('LocalStorage saved:', localStorage.getItem('locale'))
  }

  // Use useMemo to ensure translations update when locale changes
  const currentTranslations = React.useMemo(() => {
    console.log('Generating translations for locale:', locale)
    return translations[locale]
  }, [locale])

  // Log whenever locale changes
  React.useEffect(() => {
    console.log('Locale changed to:', locale)
    console.log('Current translations:', currentTranslations)
  }, [locale, currentTranslations])

  const value = React.useMemo(() => ({
    locale,
    setLocale,
    t: currentTranslations
  }), [locale, currentTranslations])

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
