'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { ProductCard } from '@/components/product-card'
import { useLanguage } from '@/contexts/LanguageContext'
import { Database } from '@/lib/supabase/database.types'

type Product = Database['public']['Tables']['products']['Row']

type SearchModalProps = {
  isOpen: boolean
  onClose: () => void
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [topProducts, setTopProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { t } = useLanguage()
  const pathname = usePathname()

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
      fetchTopProducts()
    }
  }, [isOpen])

  // Close search when the route changes (product clicked navigated away)
  useEffect(() => {
    if (isOpen) {
      onClose()
      setSearchQuery('')
    }
  }, [pathname])

  useEffect(() => {
    if (searchQuery.length > 2) {
      searchProducts()
    } else {
      setProducts([])
    }
  }, [searchQuery])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  const fetchTopProducts = async () => {
    try {
      const response = await fetch('/api/products?filter=popular&limit=6')
      const data = await response.json()
      setTopProducts(data.products || [])
    } catch (error) {
      console.error('Failed to fetch top products:', error)
    }
  }

  const searchProducts = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/products?search=${encodeURIComponent(searchQuery)}&limit=6`)
      const data = await response.json()
      setProducts(data.products || [])
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const displayProducts = searchQuery.length > 2 ? products : topProducts

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/20 z-40"
            onClick={onClose}
          />
          
          {/* Search Panel - expands below header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-full left-0 right-0 bg-gradient-to-br from-[#F8F5F0] via-white to-[#F5EFE6] border-t border-luxury-gold/20 shadow-2xl z-50 overflow-hidden"
          >
            {/* Decorative background pattern */}
            <div className="absolute inset-0 opacity-[0.03]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_rgba(184,152,95,0.4)_1px,_transparent_0)] bg-[length:24px_24px]"></div>
            </div>
            
            <div className="container mx-auto px-6 lg:px-8 py-8 lg:py-12 relative z-10">
              {/* Search Input */}
              <div className="flex items-center gap-4 mb-8">
                <div className="relative flex-1">
                  <Search className="absolute left-0 top-1/2 h-5 w-5 -translate-y-1/2 text-luxury-navy/40" />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={t.searchModal.placeholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent border-0 border-b border-luxury-navy/20 py-3 pl-8 pr-4 text-lg lg:text-xl text-luxury-navy placeholder:text-luxury-navy/40 focus:outline-none focus:border-luxury-gold tracking-wide transition-colors"
                  />
                </div>
                <button
                  onClick={onClose}
                  className="flex h-10 w-10 items-center justify-center text-luxury-navy/60 transition-colors hover:text-luxury-navy flex-shrink-0"
                  aria-label="Close search"
                >
                  <X className="h-6 w-6" strokeWidth={1.5} />
                </button>
              </div>

              {/* Divider */}
              <div className="h-px bg-luxury-navy/10 mb-8 lg:mb-12" />

              {/* Content Section */}
              <div className="grid grid-cols-1 gap-8 lg:gap-12">
            {/* Products Section */}
            <div>
              <h3 className="text-sm font-semibold text-luxury-navy uppercase tracking-widest mb-6">
                {searchQuery.length > 2 ? t.searchModal.searchResults : (t.home?.popular || 'POPULAR')}
              </h3>
              
              {loading ? (
                <div className="text-center py-16 text-luxury-navy/60">{t.searchModal.searching}</div>
              ) : displayProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-5">
                  {displayProducts.map((product) => (
                    <div key={product.id} className="w-full">
                      <ProductCard product={product} className="h-full" />
                    </div>
                  ))}
                </div>
              ) : searchQuery.length > 2 ? (
                <div className="text-center py-16 text-luxury-navy/60">{t.searchModal.noResults}</div>
              ) : null}
              </div>
            </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
