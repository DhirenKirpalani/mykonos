'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalCount?: number
  itemsPerPage?: number
  /** Custom page change handler. If omitted, navigates via URL (products page behavior). */
  onPageChange?: (page: number) => void
  /** Label for items, e.g. "products" or "orders". Defaults to "products". */
  itemLabel?: string
  /** Extra classes for the outer container */
  className?: string
}

export function Pagination({ currentPage, totalPages, totalCount, itemsPerPage, onPageChange, itemLabel = 'products', className = '' }: PaginationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const goToPage = (page: number) => {
    if (onPageChange) {
      onPageChange(page)
      return
    }
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', page.toString())
    router.push(`/products?${params.toString()}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const getPageNumbers = (compact = false) => {
    const pages: (number | string)[] = []

    if (compact) {
      // On very small screens: show prev, current, next only (e.g. 1 … 3 … 5)
      if (totalPages <= 3) {
        for (let i = 1; i <= totalPages; i++) pages.push(i)
      } else {
        if (currentPage > 1) pages.push(currentPage - 1)
        pages.push(currentPage)
        if (currentPage < totalPages) pages.push(currentPage + 1)
      }
      return pages
    }

    const showPages = 5
    if (totalPages <= showPages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push('...')
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      for (let i = start; i <= end; i++) pages.push(i)
      if (currentPage < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }

    return pages
  }

  if (totalPages <= 1) return null

  const showingFrom = itemsPerPage ? (currentPage - 1) * itemsPerPage + 1 : null
  const showingTo = itemsPerPage && totalCount ? Math.min(currentPage * itemsPerPage, totalCount) : null

  return (
    <div className={`mt-10 md:mt-14 flex flex-col items-center gap-4 ${className}`}>
      {/* Count indicator */}
      {totalCount != null && showingFrom != null && showingTo != null && (
        <p className="text-xs font-montserrat text-gray-400 tracking-wider uppercase">
          Showing <span className="text-luxury-navy font-semibold">{showingFrom}–{showingTo}</span> of{' '}
          <span className="text-luxury-navy font-semibold">{totalCount}</span> {itemLabel}
        </p>
      )}

      {/* xs screens: compact 3-page layout */}
      <div className="flex xs:hidden items-center gap-1">
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-luxury-navy transition-all hover:border-luxury-navy hover:bg-luxury-navy hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        {getPageNumbers(true).map((page, index) => (
          <button
            key={`xs-${page}-${index}`}
            onClick={() => goToPage(page as number)}
            aria-label={`Page ${page}`}
            aria-current={currentPage === page ? 'page' : undefined}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-montserrat font-semibold transition-all active:scale-95 ${
              currentPage === page
                ? 'bg-luxury-navy text-white shadow-md'
                : 'border border-gray-200 bg-white text-gray-600 hover:border-luxury-gold hover:text-luxury-gold'
            }`}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-luxury-navy transition-all hover:border-luxury-navy hover:bg-luxury-navy hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* sm+ screens: full layout */}
      <div className="hidden xs:flex items-center gap-1.5 md:gap-2">
        {/* Previous */}
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-luxury-navy transition-all hover:border-luxury-navy hover:bg-luxury-navy hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>

        {/* Page Numbers */}
        {getPageNumbers().map((page, index) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${index}`} className="px-1 text-sm text-gray-400 select-none">
                ···
              </span>
            )
          }
          return (
            <button
              key={page}
              onClick={() => goToPage(page as number)}
              aria-label={`Page ${page}`}
              aria-current={currentPage === page ? 'page' : undefined}
              className={`flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full text-xs sm:text-sm font-montserrat font-semibold transition-all active:scale-95 ${
                currentPage === page
                  ? 'bg-luxury-navy text-white shadow-md'
                  : 'border border-gray-200 bg-white text-gray-600 hover:border-luxury-gold hover:text-luxury-gold'
              }`}
            >
              {page}
            </button>
          )
        })}

        {/* Next */}
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-luxury-navy transition-all hover:border-luxury-navy hover:bg-luxury-navy hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>
      </div>

      {/* Page X of Y */}
      <p className="text-xs text-gray-400 font-montserrat tracking-wider">
        Page {currentPage} of {totalPages}
      </p>
    </div>
  )
}
