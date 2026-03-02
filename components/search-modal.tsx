'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRegion } from '@/contexts/RegionContext'
import { formatPrice } from '@/lib/utils/region'

type Product = {
  id: string
  name: string
  slug: string
  price: number
  image_urls: string[]
  size: string
}

type SearchModalProps = {
  isOpen: boolean
  onClose: () => void
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const { region } = useRegion()
  const [searchQuery, setSearchQuery] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [topProducts, setTopProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const isVideo = (url: string) => {
    return url.endsWith('.mp4') || url.endsWith('.mov') || url.includes('video')
  }

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
      fetchTopProducts()
    }
  }, [isOpen])

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
      const response = await fetch('/api/products?limit=6')
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
            className="absolute top-full left-0 right-0 bg-[#F5EFE6] border-t border-luxury-gold/20 shadow-2xl z-50"
          >
            <div className="container mx-auto px-6 lg:px-8 py-8 lg:py-12">
              {/* Search Input */}
              <div className="flex items-center gap-4 mb-8">
                <div className="relative flex-1">
                  <Search className="absolute left-0 top-1/2 h-5 w-5 -translate-y-1/2 text-luxury-navy/40" />
                  <input
                    ref={inputRef}
                    type="search"
                    placeholder="Search for fragrances..."
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
                {searchQuery.length > 2 ? 'Search Results' : 'Top Products'}
              </h3>
              
              {loading ? (
                <div className="text-center py-16 text-luxury-navy/60">Searching...</div>
              ) : displayProducts.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 lg:gap-8">
                  {displayProducts.map((product) => (
                    <Link
                      key={product.id}
                      href={`/products/${product.slug}`}
                      onClick={onClose}
                      className="group block"
                    >
                      <div className="bg-white/50 backdrop-blur-sm rounded-sm p-4 transition-all duration-300 hover:bg-white hover:shadow-lg border border-luxury-gold/10">
                        <div className="relative aspect-square mb-4 overflow-hidden bg-white/80">
                          {isVideo(product.image_urls[0]) ? (
                            <video
                              src={product.image_urls[0]}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              muted
                              playsInline
                              loop
                              autoPlay
                            />
                          ) : (
                            <Image
                              src={product.image_urls[0]}
                              alt={product.name}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          )}
                        </div>
                        <h4 className="mb-2 font-medium text-sm text-luxury-navy line-clamp-2 uppercase tracking-wider">
                          {product.name}
                        </h4>
                        <p className="text-xs text-luxury-navy/60 mb-1">{product.size}</p>
                        <p className="text-sm font-semibold text-luxury-gold">{region ? formatPrice(product.price, region) : '...'}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : searchQuery.length > 2 ? (
                <div className="text-center py-16 text-luxury-navy/60">No products found</div>
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
