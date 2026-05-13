'use client'

import { useState } from 'react'
import { Currency, CURRENCIES } from '@/lib/utils/currency'
import { useCurrency } from '@/hooks/useCurrency'
import { Globe } from 'lucide-react'

export function CurrencySelector() {
  const { currency, setCurrency } = useCurrency()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
        aria-label="Select currency"
      >
        <Globe className="h-4 w-4" />
        <span>{currency}</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-lg border border-gray-200 bg-white shadow-lg">
            <div className="p-2">
              <div className="mb-2 px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                Select Currency
              </div>
              {Object.values(CURRENCIES).map((curr) => (
                <button
                  key={curr.code}
                  onClick={() => {
                    setCurrency(curr.code as Currency)
                    setIsOpen(false)
                  }}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    currency === curr.code
                      ? 'bg-luxury-gold text-luxury-navy font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{curr.code}</span>
                    <span className="text-xs text-gray-500">{curr.symbol}</span>
                  </div>
                  <div className="text-xs text-gray-500">{curr.name}</div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
