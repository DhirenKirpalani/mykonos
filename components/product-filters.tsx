'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

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
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 font-medium">Categories</h3>
        <div className="space-y-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() =>
                updateFilter('category', currentCategory === category ? '' : category)
              }
              className={`block w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                currentCategory === category
                  ? 'bg-luxury-gold text-white'
                  : 'hover:bg-luxury-gray-light'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-4 font-medium">Sort By</h3>
        <select
          value={currentSort}
          onChange={(e) => updateFilter('sort', e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-luxury-gold focus:outline-none focus:ring-1 focus:ring-luxury-gold"
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
  )
}
