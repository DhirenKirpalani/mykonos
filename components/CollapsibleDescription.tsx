'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { ChevronDown, FileText } from 'lucide-react'

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
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-5 w-5 text-gray-400" />
          <h3 className="text-base md:text-lg font-semibold text-gray-900">{t.products.description}</h3>
        </div>
        
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
          className="mt-4 w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-all duration-200 touch-manipulation min-h-[44px] text-sm md:text-base font-medium text-gray-700"
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
