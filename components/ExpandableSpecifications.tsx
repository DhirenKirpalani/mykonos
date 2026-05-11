'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { ChevronDown, List } from 'lucide-react'

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
    { label: p.shipsFrom, value: (product as any).ships_from || null },
    { label: p.bpomNumber, value: (product as any).bpom_number || null },
  ].filter(row => row.value !== null && row.value !== '')

  if (specRows.length === 0) return null

  return (
    <div className="border-t border-gray-200 mb-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-4 py-4 text-left"
      >
        <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
          <List className="h-5 w-5 text-gray-500" strokeWidth={1.5} />
        </span>
        <span className="flex-1 text-sm font-medium text-gray-900">{p.specifications}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {isExpanded && (
        <div className="pb-5 pl-12 pr-2 divide-y divide-gray-100">
          {specRows.map(({ label, value }) => (
            <div key={label} className="flex gap-4 py-2.5">
              <span className="w-32 flex-shrink-0 text-xs uppercase tracking-[0.12em] text-gray-400 pt-0.5">
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
