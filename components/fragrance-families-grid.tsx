'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { motion } from 'framer-motion'
import { Droplets, Flower2, Sparkles, Wind, Leaf, Coffee, Apple, Flame, Sun } from 'lucide-react'

type FragranceFamily = {
  id: string
  name: string
  description_en: string
  description_id: string
  image_url: string
  display_order: number
}

const fragranceIcons: Record<string, any> = {
  'Citrus': Sun,
  'Floral': Flower2,
  'Fruity': Apple,
  'Woody & Vanilla': Leaf,
  'Gourmand': Coffee,
  'Musky': Sparkles,
  // Legacy mappings for backward compatibility
  'Aqua & Aromatic': Droplets,
  'Floral Fantasy': Flower2,
  'Oriental': Sparkles,
  'Sweet Fruity': Apple,
  'Powdery Elegance': Wind,
  'Gourmand Galore': Coffee,
  'Fresh': Leaf,
  'Woody': Flame,
}

const getIconForFamily = (name: string) => {
  return fragranceIcons[name] || Sparkles
}

export function FragranceFamiliesGrid() {
  const { t, locale } = useLanguage()
  const [fragranceFamilies, setFragranceFamilies] = useState<FragranceFamily[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFragranceFamilies()
  }, [])

  const fetchFragranceFamilies = async () => {
    try {
      const response = await fetch('/api/fragrance-families')
      const data = await response.json()
      setFragranceFamilies(data.fragrance_families || [])
    } catch (error) {
      console.error('Failed to fetch fragrance families:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="relative bg-gradient-to-b from-[#F5EFE6] to-[#E8DCC4] py-10 md:py-16 lg:py-20">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="mb-8 md:mb-12 text-center">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8A6A3F] md:mb-3 md:text-xs md:tracking-[0.25em]">
            {t.home.discoverSignature}
          </p>
          <h2 className="mb-3 font-serif text-2xl font-bold text-[#1C2E4A] md:mb-5 md:text-3xl lg:text-4xl tracking-tight">
            {t.home.fragranceFamiliesTitle}
          </h2>
          <div className="mx-auto h-0.5 w-16 bg-luxury-gold/70 rounded-full mb-4 md:mb-6 md:w-20" />
          <p className="mx-auto max-w-2xl text-sm text-[#5A4A3A]/90 md:text-base lg:text-lg leading-relaxed px-4">
            {t.home.fragranceFamiliesDesc}
          </p>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8A6A3F] border-t-transparent"></div>
              <p className="text-[#8A6A3F] text-sm">Loading...</p>
            </div>
          </div>
        ) : fragranceFamilies.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6 lg:gap-7 max-w-6xl mx-auto">
            {fragranceFamilies.map((family, index) => {
              const Icon = getIconForFamily(family.name)
              return (
                <motion.div
                  key={family.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.4 }}
                  className="h-full"
                >
                  <Link 
                    href={`/products?category=${encodeURIComponent(family.name)}`}
                    className="group block relative h-full"
                  >
                    <div className="relative bg-white rounded-2xl p-5 sm:p-6 md:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-luxury-gold active:scale-[0.98] h-full min-h-[200px] sm:min-h-[220px] md:min-h-[240px] flex flex-col items-center justify-center text-center touch-manipulation">
                      <div className="mb-4 sm:mb-5 md:mb-6 relative flex-shrink-0">
                        <div className="w-14 h-14 sm:w-18 sm:h-18 md:w-22 md:h-22 rounded-full bg-gradient-to-br from-luxury-gold/20 to-[#8A6A3F]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-md">
                          <Icon className="w-7 h-7 sm:w-9 sm:h-9 md:w-11 md:h-11 text-[#8A6A3F] group-hover:text-luxury-gold transition-colors duration-300" strokeWidth={1.5} />
                        </div>
                        <div className="absolute -inset-2 bg-gradient-to-br from-[#C2A36B]/20 to-transparent rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
                      </div>
                      
                      <h3 className="font-serif text-base sm:text-lg md:text-xl font-bold text-luxury-navy mb-2 sm:mb-2.5 group-hover:text-luxury-gold transition-colors duration-300">
                        {family.name}
                      </h3>
                      
                      <p className="text-xs md:text-sm text-[#5A4A3A]/80 leading-relaxed flex-grow line-clamp-2">
                        {locale === 'id' ? family.description_id : family.description_en}
                      </p>
                      
                      <div className="mt-4 md:mt-5 flex items-center gap-2 text-luxury-gold md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                        <span className="text-xs font-semibold uppercase tracking-wider">{t.common.explore}</span>
                        <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-[#8A6A3F]">No fragrance families available</p>
          </div>
        )}
      </div>
    </section>
  )
}
