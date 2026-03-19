'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Droplets, Flower2, Sparkles, Wind, Leaf, Coffee, Apple, Flame } from 'lucide-react'

type FragranceFamily = {
  id: string
  name: string
  description: string
  image_url: string
  display_order: number
}

const fragranceIcons: Record<string, any> = {
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
    <section className="relative bg-gradient-to-b from-[#F5EFE6] to-[#E8DCC4] py-12 md:py-16 lg:py-20">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="mb-10 md:mb-14 text-center">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.25em] text-[#8A6A3F]/75 md:mb-3 md:text-xs md:tracking-[0.3em]">
            Discover Your Signature
          </p>
          <h2 className="mb-4 font-serif text-2xl font-bold text-[#1C2E4A] md:mb-6 md:text-3xl lg:text-5xl">
            Fragrance Families
          </h2>
          <p className="mx-auto max-w-2xl text-sm text-[#5A4A3A]/90 md:text-base lg:text-lg">
            Each scent tells a story. Find yours among our carefully curated collections
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5 lg:gap-6 max-w-6xl mx-auto">
            {fragranceFamilies.map((family, index) => {
              const Icon = getIconForFamily(family.name)
              return (
                <motion.div
                  key={family.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.4 }}
                >
                  <Link 
                    href={`/products?category=${encodeURIComponent(family.name)}`}
                    className="group block relative"
                  >
                    <div className="relative bg-white rounded-2xl p-6 md:p-8 shadow-md hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-[#C2A36B] h-full flex flex-col items-center text-center">
                      <div className="mb-4 md:mb-5 relative">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-[#C2A36B]/20 to-[#8A6A3F]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Icon className="w-8 h-8 md:w-10 md:h-10 text-[#8A6A3F] group-hover:text-[#C2A36B] transition-colors duration-300" strokeWidth={1.5} />
                        </div>
                        <div className="absolute -inset-2 bg-gradient-to-br from-[#C2A36B]/20 to-transparent rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
                      </div>
                      
                      <h3 className="font-serif text-base md:text-lg font-bold text-[#1C2E4A] mb-2 group-hover:text-[#8A6A3F] transition-colors duration-300">
                        {family.name}
                      </h3>
                      
                      <p className="text-xs md:text-sm text-[#5A4A3A]/80 line-clamp-2 leading-relaxed">
                        {family.description}
                      </p>
                      
                      <div className="mt-4 flex items-center gap-2 text-[#8A6A3F] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <span className="text-xs font-medium uppercase tracking-wider">Explore</span>
                        <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
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
