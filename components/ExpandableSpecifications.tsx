'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { ChevronRight, Package, Sparkles, Clock, Globe, FileText } from 'lucide-react'

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

  // Icon mapping for different spec types
  const getSpecIcon = (label: string) => {
    if (label.toLowerCase().includes('size') || label.toLowerCase().includes('ukuran')) return <Package className="h-4 w-4" />
    if (label.toLowerCase().includes('note')) return <Sparkles className="h-4 w-4" />
    if (label.toLowerCase().includes('shelf') || label.toLowerCase().includes('masa')) return <Clock className="h-4 w-4" />
    if (label.toLowerCase().includes('country') || label.toLowerCase().includes('negara')) return <Globe className="h-4 w-4" />
    return <FileText className="h-4 w-4" />
  }

  return (
    <div className="border-t border-gray-200">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between py-4 w-full text-left active:bg-gray-50 transition-colors touch-manipulation min-h-[60px] -mx-1 px-1 rounded-lg"
      >
        <div className="flex-1">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-1">{p.specifications}</h3>
          {!isExpanded && (
            <span className="text-xs md:text-sm text-gray-500 line-clamp-1">{previewText}</span>
          )}
        </div>
        <ChevronRight 
          className={`h-5 w-5 text-gray-400 flex-shrink-0 ml-3 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}
        />
      </button>

      {isExpanded && (
        <div className="border-t border-gray-100 pb-4 animate-in slide-in-from-top-2 duration-300">
          <div className="space-y-3 pt-4">
            {specRows.map(({ label, value }) => (
              <div key={label} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50/50 hover:bg-gray-50 transition-colors">
                <div className="text-gray-400 mt-0.5">
                  {getSpecIcon(label)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs md:text-sm text-gray-500 mb-1">{label}</div>
                  <div className="text-sm md:text-base text-gray-900 font-medium break-words">{value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
