'use client'

import { useState, useEffect } from 'react'
import { X, SlidersHorizontal } from 'lucide-react'
import { ProductFilters as Filters } from '@/lib/types/product'
import { supabase } from '@/lib/supabase/client'

interface ProductFiltersProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  onClose?: () => void
}

export function ProductFilters({ filters, onFiltersChange, onClose }: ProductFiltersProps) {
  const [collections, setCollections] = useState<any[]>([])
  const [fragranceFamilies, setFragranceFamilies] = useState<any[]>([])

  useEffect(() => {
    fetchCollections()
    fetchFragranceFamilies()
  }, [])

  const fetchCollections = async () => {
    const { data } = await supabase
      .from('collections')
      .select('*')
      .order('display_order')
    setCollections(data || [])
  }

  const fetchFragranceFamilies = async () => {
    const { data } = await supabase
      .from('fragrance_families')
      .select('*')
      .order('display_order')
    setFragranceFamilies(data || [])
  }

  const handleFilterChange = (key: keyof Filters, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    onFiltersChange({})
  }

  const activeFilterCount = Object.values(filters).filter(v => v !== undefined && v !== '').length

  return (
    <div className="rounded-lg border border-border/40 bg-white p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5" />
          <h3 className="font-serif text-lg font-bold">Filters</h3>
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-luxury-gold px-2 py-0.5 text-xs font-medium text-luxury-navy">
              {activeFilterCount}
            </span>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Collection Filter */}
        <div>
          <label className="mb-3 block text-sm font-medium">Collection</label>
          <div className="space-y-2">
            {collections.map((collection) => (
              <label key={collection.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="collection"
                  checked={filters.collection === collection.name}
                  onChange={() => handleFilterChange('collection', collection.name)}
                  className="h-4 w-4 border-gray-300 text-luxury-gold focus:ring-luxury-gold"
                />
                <span className="text-sm">{collection.name}</span>
              </label>
            ))}
            {filters.collection && (
              <button
                onClick={() => handleFilterChange('collection', undefined)}
                className="text-xs text-luxury-gold hover:underline"
              >
                Clear selection
              </button>
            )}
          </div>
        </div>

        {/* Fragrance Family Filter */}
        <div className="border-t border-border/40 pt-6">
          <label className="mb-3 block text-sm font-medium">Fragrance Family</label>
          <div className="space-y-2">
            {fragranceFamilies.map((family) => (
              <label key={family.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="fragrance_family"
                  checked={filters.fragrance_family === family.name}
                  onChange={() => handleFilterChange('fragrance_family', family.name)}
                  className="h-4 w-4 border-gray-300 text-luxury-gold focus:ring-luxury-gold"
                />
                <span className="text-sm">{family.name}</span>
              </label>
            ))}
            {filters.fragrance_family && (
              <button
                onClick={() => handleFilterChange('fragrance_family', undefined)}
                className="text-xs text-luxury-gold hover:underline"
              >
                Clear selection
              </button>
            )}
          </div>
        </div>

        {/* Price Range Filter */}
        <div className="border-t border-border/40 pt-6">
          <label className="mb-3 block text-sm font-medium">Price Range</label>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Min</label>
                <input
                  type="number"
                  placeholder="0"
                  value={filters.price_min || ''}
                  onChange={(e) => handleFilterChange('price_min', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-luxury-gold focus:outline-none focus:ring-1 focus:ring-luxury-gold"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Max</label>
                <input
                  type="number"
                  placeholder="500"
                  value={filters.price_max || ''}
                  onChange={(e) => handleFilterChange('price_max', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-luxury-gold focus:outline-none focus:ring-1 focus:ring-luxury-gold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Availability Filter */}
        <div className="border-t border-border/40 pt-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.in_stock || false}
              onChange={(e) => handleFilterChange('in_stock', e.target.checked || undefined)}
              className="h-4 w-4 rounded border-gray-300 text-luxury-gold focus:ring-luxury-gold"
            />
            <span className="text-sm font-medium">In Stock Only</span>
          </label>
        </div>

        {/* Clear All */}
        {activeFilterCount > 0 && (
          <div className="border-t border-border/40 pt-6">
            <button
              onClick={clearFilters}
              className="w-full rounded-md border border-border/40 px-4 py-2 text-sm font-medium transition-colors hover:bg-luxury-gray-light"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
