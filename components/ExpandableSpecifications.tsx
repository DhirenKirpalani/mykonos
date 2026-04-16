'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'

interface ExpandableSpecificationsProps {
  product: any
  fragranceFamily: string
}

export function ExpandableSpecifications({ product, fragranceFamily }: ExpandableSpecificationsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { t } = useLanguage()
  const p = t.products

  const specRows = [
    { label: p.size, value: (product as any).volume_ml ? `${(product as any).volume_ml}ml` : null },
    { label: p.collection, value: product.collection || null },
    { label: p.fragranceFamily, value: fragranceFamily || null },
    { label: p.topNotes, value: (product as any).top_notes || null },
    { label: p.middleNotes, value: (product as any).middle_notes || null },
    { label: p.baseNotes, value: (product as any).base_notes || null },
    { label: p.shelfLife, value: (product as any).shelf_life || null },
    { label: p.countryOfOrigin, value: (product as any).country_of_origin || null },
    { label: p.shipsFrom, value: (product as any).ships_from || null },
    { label: p.bpomNumber, value: (product as any).bpom_number || null },
  ].filter(row => row.value !== null && row.value !== '')

  return (
    <div className="border-t border-gray-200">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between py-3 w-full text-left"
      >
        <div className="flex-1">
          <h3 className="text-base font-semibold text-gray-900 mb-1">{p.specifications}</h3>
          {!isExpanded && (
            <span className="text-sm text-gray-500">{p.specsPreview}</span>
          )}
        </div>
        <svg 
          className={`h-5 w-5 text-gray-400 flex-shrink-0 ml-2 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-100 pb-3">
          <div className="space-y-2.5 text-sm pt-3">
            {specRows.map(({ label, value }) => (
              <div key={label} className="flex">
                <span className="w-40 flex-shrink-0 text-gray-500">{label}</span>
                <span className="text-gray-900 font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
