'use client'

import { useState } from 'react'
import Link from 'next/link'

interface ExpandableSpecificationsProps {
  product: any
  fragranceFamily: string
}

export function ExpandableSpecifications({ product, fragranceFamily }: ExpandableSpecificationsProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="border-t border-gray-200">
      {!isExpanded ? (
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between py-3 w-full text-left"
        >
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Spesifikasi</h3>
            <span className="text-sm text-gray-500">Stok, Merek, Ukuran Produk, Fragrance Notes, BPOM...</span>
          </div>
          <svg 
            className="h-5 w-5 text-gray-400 flex-shrink-0 ml-2" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      ) : (
        <div>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-between py-3 w-full"
          >
            <h3 className="text-base font-semibold text-gray-900">Spesifikasi</h3>
            <svg 
              className="h-5 w-5 text-gray-400 transition-transform rotate-90" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div className="border-t border-gray-100 pt-3">
            <div className="space-y-3 text-sm">
              {product.stock_quantity !== undefined && (
                <div className="flex">
                  <span className="w-40 text-gray-600">Stock</span>
                  <span className="text-gray-900">{product.stock_quantity}</span>
                </div>
              )}
              {(product as any).volume_ml && (
                <div className="flex">
                  <span className="w-40 text-gray-600">Size</span>
                  <span className="text-gray-900">{(product as any).volume_ml}ml</span>
                </div>
              )}
              {product.collection && (
                <div className="flex">
                  <span className="w-40 text-gray-600">Collection</span>
                  <span className="text-gray-900">{product.collection}</span>
                </div>
              )}
              {fragranceFamily && (
                <div className="flex">
                  <span className="w-40 text-gray-600">Fragrance Family</span>
                  <span className="text-gray-900">{fragranceFamily}</span>
                </div>
              )}
              {(product as any).top_notes && (
                <div className="flex">
                  <span className="w-40 text-gray-600">Top Notes</span>
                  <span className="text-gray-900">{(product as any).top_notes}</span>
                </div>
              )}
              {(product as any).middle_notes && (
                <div className="flex">
                  <span className="w-40 text-gray-600">Middle Notes</span>
                  <span className="text-gray-900">{(product as any).middle_notes}</span>
                </div>
              )}
              {(product as any).base_notes && (
                <div className="flex">
                  <span className="w-40 text-gray-600">Base Notes</span>
                  <span className="text-gray-900">{(product as any).base_notes}</span>
                </div>
              )}
              {(product as any).country_of_origin && (
                <div className="flex">
                  <span className="w-40 text-gray-600">Country of Origin</span>
                  <span className="text-gray-900">{(product as any).country_of_origin}</span>
                </div>
              )}
              {(product as any).bpom_number && (
                <div className="flex">
                  <span className="w-40 text-gray-600">BPOM No.</span>
                  <span className="text-gray-900">{(product as any).bpom_number}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
