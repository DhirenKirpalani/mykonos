'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'

interface CollapsibleDescriptionProps {
  description: string
}

export function CollapsibleDescription({ description }: CollapsibleDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { t } = useLanguage()

  if (!description) return null

  return (
    <div className="border-t border-gray-200 pt-4">
      <h3 className="text-base font-semibold text-gray-900 mb-3">{t.products.description}</h3>
      <div className="relative">
        <div 
          className={`prose prose-sm max-w-none text-gray-600 text-sm leading-relaxed transition-all duration-300 overflow-hidden ${
            isExpanded ? 'max-h-[2000px]' : 'max-h-32'
          }`}
          dangerouslySetInnerHTML={{ __html: description }}
        />
        {!isExpanded && (
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        )}
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-3 text-sm text-[#1C2E4A] font-medium flex items-center gap-1 hover:text-[#C2A36B] transition-colors"
        >
          <span>{isExpanded ? t.products.showLess : t.products.showMore}</span>
          <svg 
            className={`h-4 w-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </div>
  )
}
