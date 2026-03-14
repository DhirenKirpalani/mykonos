'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronDown, X } from 'lucide-react'

const fragranceFamilies = [
  'Aqua & Aromatic',
  'Floral Fantasy',
  'Oriental',
  'Fresh Fruity',
  'Powdery Elegance',
  'Gourmand Galore',
]
const sortOptions = [
  { value: 'popular', label: 'Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'best-selling', label: 'Best Selling' },
  { value: 'price-asc', label: 'Price ↑' },
  { value: 'price-desc', label: 'Price ↓' },
]

export function ProductFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isOpen, setIsOpen] = useState(false)
  const [fragranceDropdownOpen, setFragranceDropdownOpen] = useState(false)

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/products?${params.toString()}`)
  }

  const clearFilters = () => {
    router.push('/products')
  }

  const currentCategory = searchParams.get('category')
  const currentSort = searchParams.get('sort') || 'best-selling'

  return (
    <>
      {/* Mobile Filter Toggle */}
      <div className="lg:hidden">
        <button
          data-filter-toggle
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between rounded-lg border border-border bg-white px-4 py-3 text-sm font-medium shadow-sm transition-colors hover:bg-gray-50"
        >
          <span>Fragrance Families</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Mobile Filter Bottom Sheet */}
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-200"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Bottom Sheet */}
            <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl animate-in slide-in-from-bottom duration-300">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Filters</h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="rounded-full p-2 hover:bg-gray-100 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-4 space-y-6">
            <div>
              <h4 className="mb-3 text-sm font-medium text-gray-700">Fragrance Family</h4>
              <div className="space-y-2">
                <div>
                  <button
                    onClick={() => setFragranceDropdownOpen(!fragranceDropdownOpen)}
                    className="flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-all bg-gray-50 text-gray-700 hover:bg-gray-100"
                  >
                    <span>{currentCategory || 'All Families'}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${fragranceDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {fragranceDropdownOpen && (
                    <div className="mt-2 space-y-2">
                      <button
                        onClick={() => {
                          updateFilter('category', '')
                          setFragranceDropdownOpen(false)
                        }}
                        className={`block w-full rounded-lg px-4 py-2 text-left text-sm transition-all ${
                          !currentCategory
                            ? 'bg-[#C2A36B] text-white font-medium'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        All Families
                      </button>
                      {fragranceFamilies.map((family) => (
                        <button
                          key={family}
                          onClick={() => {
                            updateFilter('category', family)
                            setFragranceDropdownOpen(false)
                            setIsOpen(false)
                          }}
                          className={`block w-full rounded-lg px-4 py-2 text-left text-sm transition-all ${
                            currentCategory === family
                              ? 'bg-[#C2A36B] text-white font-medium'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {family}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {currentCategory && (
              <Button 
                variant="outline" 
                onClick={() => {
                  clearFilters()
                  setIsOpen(false)
                }} 
                className="w-full"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
          </>
        )}
      </div>

      {/* Desktop Filters */}
      <div className="hidden space-y-6 lg:block">
        {/* Sort Section */}
        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-700">Sort By</h3>
          <div className="space-y-2">
            <button
              onClick={() => updateFilter('sort', 'popular')}
              className={`block w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-all ${
                currentSort === 'popular'
                  ? 'bg-[#C2A36B] text-white shadow-sm'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Popular
            </button>
            <button
              onClick={() => updateFilter('sort', 'newest')}
              className={`block w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-all ${
                currentSort === 'newest'
                  ? 'bg-[#C2A36B] text-white shadow-sm'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Newest
            </button>
            <button
              onClick={() => updateFilter('sort', 'best-selling')}
              className={`block w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-all ${
                currentSort === 'best-selling'
                  ? 'bg-[#C2A36B] text-white shadow-sm'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Best Selling
            </button>
            <button
              onClick={() => {
                const currentPrice = currentSort?.startsWith('price-') ? currentSort : null
                if (currentPrice === 'price-asc') {
                  updateFilter('sort', 'price-desc')
                } else {
                  updateFilter('sort', 'price-asc')
                }
              }}
              className={`block w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-all ${
                currentSort?.startsWith('price-')
                  ? 'bg-[#C2A36B] text-white shadow-sm'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Price {currentSort === 'price-desc' ? '↓' : '↑'}
            </button>
          </div>
        </div>

        {/* Fragrance Family Section */}
        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-700">Fragrance Family</h3>
          <div className="space-y-2">
            <button
              onClick={() => updateFilter('category', '')}
              className={`block w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-all ${
                !currentCategory
                  ? 'bg-[#C2A36B] text-white shadow-sm'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              All Families
            </button>
            
            {fragranceFamilies.map((family) => (
              <button
                key={family}
                onClick={() => updateFilter('category', family)}
                className={`block w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-all ${
                  currentCategory === family
                    ? 'bg-[#C2A36B] text-white shadow-sm'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {family}
              </button>
            ))}
          </div>
        </div>

        {currentCategory && (
          <Button variant="outline" onClick={clearFilters} className="w-full">
            Clear Filters
          </Button>
        )}
      </div>
    </>
  )
}
