'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/LanguageContext'


export function ProductFilters() {
  const { t } = useLanguage()
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
    router.push('/products?filter=all')
  }

  const currentCategory = searchParams.get('category')
  const currentFilter = searchParams.get('filter') || undefined
  const currentSort = searchParams.get('sort')
  const currentGender = searchParams.get('gender') || undefined

  return (
    <>
      {/* Desktop Filters */}
      <div className="hidden space-y-6 lg:block">
        {/* Sort + Gender Section */}
        <div>
          <h3 className="mb-4 text-sm font-montserrat font-semibold uppercase tracking-wider text-gray-700">FILTER</h3>
          <div className="space-y-2">
            <button
              onClick={() => updateFilter('filter', currentFilter === 'popular' ? '' : 'popular')}
              className={`block w-full rounded-lg px-4 py-2.5 text-left text-sm font-montserrat font-semibold transition-all ${
                currentFilter === 'popular'
                  ? 'bg-[#C2A36B] text-white shadow-sm'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t.productsPage.sort.popular}
            </button>
            <button
              onClick={() => updateFilter('filter', currentFilter === 'newest' ? '' : 'newest')}
              className={`block w-full rounded-lg px-4 py-2.5 text-left text-sm font-montserrat font-semibold transition-all ${
                currentFilter === 'newest'
                  ? 'bg-[#C2A36B] text-white shadow-sm'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t.productsPage.sort.newest}
            </button>
            <button
              onClick={() => {
                const currentSort = searchParams.get('sort')
                if (currentSort === 'price-asc') {
                  updateFilter('sort', 'price-desc')
                } else {
                  updateFilter('sort', 'price-asc')
                }
              }}
              className={`block w-full rounded-lg px-4 py-2.5 text-left text-sm font-montserrat font-semibold transition-all ${
                searchParams.get('sort')?.startsWith('price-')
                  ? 'bg-[#C2A36B] text-white shadow-sm'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t.productsPage.price} {searchParams.get('sort') === 'price-desc' ? '↓' : '↑'}
            </button>

            {/* Gender filters — inline in FILTER section */}
            <div className="pt-1 border-t border-gray-100" />
            <button
              onClick={() => updateFilter('gender', currentGender === 'male' ? '' : 'male')}
              className={`block w-full rounded-lg px-4 py-2.5 text-left text-sm font-montserrat font-semibold transition-all ${
                currentGender === 'male' ? 'bg-[#C2A36B] text-white shadow-sm' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              For Men
            </button>
            <button
              onClick={() => updateFilter('gender', currentGender === 'female' ? '' : 'female')}
              className={`block w-full rounded-lg px-4 py-2.5 text-left text-sm font-montserrat font-semibold transition-all ${
                currentGender === 'female' ? 'bg-[#C2A36B] text-white shadow-sm' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              For Women
            </button>
            <button
              onClick={() => updateFilter('gender', currentGender === 'unisex' ? '' : 'unisex')}
              className={`block w-full rounded-lg px-4 py-2.5 text-left text-sm font-montserrat font-semibold transition-all ${
                currentGender === 'unisex' ? 'bg-[#C2A36B] text-white shadow-sm' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Unisex
            </button>
          </div>
        </div>

        {(currentCategory || currentFilter !== 'all' || currentSort || currentGender) && (
          <Button variant="outline" onClick={clearFilters} className="w-full font-montserrat">
            {t.productsPage.clearFilters}
          </Button>
        )}
      </div>
    </>
  )
}
