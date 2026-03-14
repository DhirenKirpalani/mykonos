'use client'

import { useState } from 'react'

interface CollapsibleDescriptionProps {
  description: string
}

export function CollapsibleDescription({ description }: CollapsibleDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="border-t border-gray-200 pt-4">
      <h3 className="text-base font-semibold text-gray-900 mb-3">Deskripsi</h3>
      <div className="relative">
        <div 
          className={`prose prose-sm max-w-none text-gray-600 text-sm leading-relaxed transition-all duration-300 ${
            isExpanded ? '' : 'max-h-32 overflow-hidden'
          }`}
          dangerouslySetInnerHTML={{ __html: description || '' }}
        />
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-4 text-sm text-gray-500 flex items-center gap-1 hover:text-gray-700"
        >
          <span>{isExpanded ? 'Lebih Sedikit' : 'Selengkapnya'}</span>
          <svg 
            className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
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
