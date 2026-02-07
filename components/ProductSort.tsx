'use client'

import { SortOption } from '@/lib/types/product'
import { ArrowUpDown } from 'lucide-react'

interface ProductSortProps {
  value: SortOption
  onChange: (sort: SortOption) => void
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'editorial', label: 'Featured' },
  { value: 'new-arrivals', label: 'New Arrivals' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
]

export function ProductSort({ value, onChange }: ProductSortProps) {
  return (
    <div className="flex items-center gap-3">
      <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        className="rounded-md border border-input bg-background px-4 py-2 text-sm focus:border-luxury-gold focus:outline-none focus:ring-1 focus:ring-luxury-gold"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
