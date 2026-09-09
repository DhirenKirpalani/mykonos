'use client'

import React, { createContext, useContext, useState, useLayoutEffect } from 'react'
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

  // Load saved locale before paint to prevent text flash
  useLayoutEffect(() => {
    const savedLocale = localStorage.getItem('locale') as Locale
    if (savedLocale && (savedLocale === 'en' || savedLocale === 'id')) {
      setLocaleState(savedLocale)
    }
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem('locale', newLocale)
  }

  const currentTranslations = React.useMemo(() => {
    return translations[locale]
  }, [locale])

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
