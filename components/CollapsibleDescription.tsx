'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { ChevronDown } from 'lucide-react'

interface CollapsibleDescriptionProps {
  description: string
}

export function CollapsibleDescription({ description }: CollapsibleDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { t } = useLanguage()

  if (!description) return null

  return (
    <div className="border-t border-gray-200">
      {/* Header */}
      <div className="py-4">
        <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3">{t.products.description}</h3>
        
        {/* Description Content */}
        <div className="relative">
          <div 
            className={`prose prose-sm max-w-none text-gray-700 text-sm md:text-base leading-relaxed transition-all duration-500 ease-in-out overflow-hidden ${
              isExpanded ? 'max-h-[3000px] opacity-100' : 'max-h-24 md:max-h-32'
            }`}
            style={{
              WebkitMaskImage: !isExpanded ? 'linear-gradient(to bottom, black 50%, transparent 100%)' : 'none',
              maskImage: !isExpanded ? 'linear-gradient(to bottom, black 50%, transparent 100%)' : 'none'
            }}
            dangerouslySetInnerHTML={{ __html: description }}
          />
        </div>
        
        {/* Show More/Less Button */}
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-3 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 active:text-gray-900 transition-colors duration-200 touch-manipulation min-h-[44px] px-0"
        >
          <span>{isExpanded ? t.products.showLess : t.products.showMore}</span>
          <ChevronDown 
            className={`h-4 w-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>
      </div>
    </div>
  )
}
