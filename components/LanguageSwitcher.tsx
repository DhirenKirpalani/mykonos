'use client'

import { useState, useEffect } from 'react'
import { Globe } from 'lucide-react'

export function LanguageSwitcher() {
  const [pageLang, setPageLang] = useState<string>('')

  useEffect(() => {
    setPageLang(localStorage.getItem('page_lang') || '')
  }, [])

  const handleSetLang = (lang: string) => {
    if (lang) {
      localStorage.setItem('page_lang', lang)
    } else {
      localStorage.removeItem('page_lang')
    }
    window.location.reload()
  }

  const langLabel = pageLang ? pageLang.toUpperCase() : ''

  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 py-2 backdrop-blur-sm">
      <Globe className="h-4 w-4 text-luxury-gold" />
      <div className="flex items-center gap-1">
        <button
          onClick={() => handleSetLang('')}
          className={`px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
            !pageLang
              ? 'bg-luxury-gold text-luxury-navy shadow-sm'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          EN
        </button>
        {langLabel && langLabel !== 'EN' && (
          <>
            <span className="text-white/30">|</span>
            <button
              onClick={() => handleSetLang(pageLang)}
              className="px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wider transition-all bg-luxury-gold text-luxury-navy shadow-sm"
            >
              {langLabel}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
