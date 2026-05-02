'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { ChevronRight } from 'lucide-react'

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

  // Generate dynamic preview text from first 3 specs
  const previewText = specRows.slice(0, 3).map(row => row.value).join(', ') || p.specsPreview

  return (
    <div className="pb-8">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left group"
      >
        <div className="flex items-center gap-3 mb-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-luxury-navy">
            {p.specifications}
          </p>
          <div className="flex-1 h-px bg-gradient-to-r from-luxury-gold/40 to-transparent" />
          <ChevronRight
            className={`h-3.5 w-3.5 text-luxury-gold flex-shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}
          />
        </div>
        {!isExpanded && (
          <p className="text-xs text-gray-400 tracking-wide line-clamp-1 mt-2">{previewText}</p>
        )}
      </button>

      {isExpanded && (
        <div className="mt-4 divide-y divide-gray-100">
          {specRows.map(({ label, value }) => (
            <div key={label} className="flex gap-4 py-2.5">
              <span className="w-36 flex-shrink-0 text-xs uppercase tracking-[0.12em] text-gray-400 pt-0.5">
                {label}
              </span>
              <span className="text-sm text-luxury-navy font-medium leading-relaxed">
                {value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
