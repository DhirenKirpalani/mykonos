'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronDown, X } from 'lucide-react'

const categories = ['Fragrances', 'Body Line', 'Gift Sets']
const sortOptions = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name', label: 'Name: A-Z' },
]

export function ProductFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isOpen, setIsOpen] = useState(false)

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
  const currentSort = searchParams.get('sort') || 'newest'

  return (
    <>
      {/* Mobile Filter Toggle */}
      <div className="lg:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between rounded-lg border border-border bg-white px-4 py-3 text-sm font-medium shadow-sm transition-colors hover:bg-gray-50"
        >
          <span>Filters & Sort</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Mobile Filter Panel */}
        {isOpen && (
          <div className="mt-3 space-y-4 rounded-lg border border-border bg-white p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Filters</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-medium text-gray-700">Categories</h4>
              <div className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => {
                      updateFilter('category', currentCategory === category ? '' : category)
                      setIsOpen(false)
                    }}
                    className={`block w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-all active:scale-98 ${
                      currentCategory === category
                        ? 'bg-luxury-gold text-white shadow-sm'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-medium text-gray-700">Sort By</h4>
              <select
                value={currentSort}
                onChange={(e) => {
                  updateFilter('sort', e.target.value)
                  setIsOpen(false)
                }}
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {(currentCategory || currentSort !== 'newest') && (
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
        )}
      </div>

      {/* Desktop Filters */}
      <div className="hidden space-y-6 lg:block">
        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-700">Categories</h3>
          <div className="space-y-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() =>
                  updateFilter('category', currentCategory === category ? '' : category)
                }
                className={`block w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-all ${
                  currentCategory === category
                    ? 'bg-luxury-gold text-white shadow-sm'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-700">Sort By</h3>
          <select
            value={currentSort}
            onChange={(e) => updateFilter('sort', e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {(currentCategory || currentSort !== 'newest') && (
          <Button variant="outline" onClick={clearFilters} className="w-full">
            Clear Filters
          </Button>
        )}
      </div>
    </>
  )
}
