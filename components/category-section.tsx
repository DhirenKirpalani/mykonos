'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { Flower2, Apple, Cake, Sparkles, Waves, Star, Leaf, Sun, Wind, Flame, Coffee } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

type FragranceFamily = {
  id: string
  name: string
  description_en: string
  description_id: string
  image_url: string
  display_order: number
}

const iconMap: Record<string, any> = {
  'Fruity Floral': Flower2,
  'Smoky Citrus': Flame,
  'Tropical Gourmand': Coffee,
  'Musky Powdery': Sparkles,
  'Citrus Aromatic': Sun,
  'Spicy Gourmand': Flame,
  'Sweet Gourmand': Coffee,
  'Fruity Clean': Apple,
  'Fruity Ambery': Apple,
  'Tropical Fruity': Apple,
  'Citrus Clean': Sun,
  'Milky Musky': Sparkles,
  'Milky Fruity': Apple,
  'Milky Sweet': Coffee,
  'Spicy Vanilla': Flame,
  'Citrus Floral': Flower2,
  'Floral Musky': Flower2,
  'Fruity Woody': Leaf,
  'Citrus Aquatic': Waves,
  'Citrus Spicy': Sun,
  'Floral Vanilla': Flower2,
  'Floral Woody': Leaf,
  'Smoky Floral': Flame,
  // Legacy mappings for backward compatibility
  'Citrus': Sun,
  'Floral': Flower2,
  'Fruity': Apple,
  'Woody & Vanilla': Leaf,
  'Gourmand': Coffee,
  'Musky': Sparkles,
  'Aqua & Aromatic': Waves,
  'Floral Fantasy': Flower2,
  'Oriental': Star,
  'Fresh Fruity': Apple,
  'Powdery Elegance': Sparkles,
  'Gourmand Galore': Coffee,
  'Aquatic Aromatic': Waves,
  'Woody': Flame,
  'Fresh': Leaf,
}

export function CategorySection() {
  const { locale } = useLanguage()
  const [categories, setCategories] = useState<FragranceFamily[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFragranceFamilies()
  }, [])

  const fetchFragranceFamilies = async () => {
    try {
      const response = await fetch('/api/fragrance-families')
      const data = await response.json()
      setCategories(data.fragrance_families || [])
    } catch (error) {
      console.error('Failed to fetch fragrance families:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <section className="relative bg-[#EFE6D3] py-20 lg:py-32">
        <div className="container relative mx-auto px-4 lg:px-8">
          <div className="text-center">Loading...</div>
        </div>
      </section>
    )
  }
  return (
    <section className="relative bg-[#EFE6D3] py-20 lg:py-32">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_rgba(0,0,0,0.02)_1px,_transparent_0)] bg-[length:40px_40px]" />
      
      <div className="container relative mx-auto px-4 lg:px-8">
        <div className="mb-16 text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-[#8A6A3F]/80">
            Discover Your Signature
          </p>
          <h2 className="mb-6 font-serif text-4xl font-bold text-[#3A2A1A] lg:text-5xl">
            Fragrance Families
          </h2>
          <p className="mx-auto max-w-2xl text-base text-[#5A4A3A]/90 lg:text-lg">
            Each scent tells a story. Find yours among our carefully curated collections
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {categories.map((category, index) => {
            const Icon = iconMap[category.name] || Sparkles
            const href = `/products?category=${encodeURIComponent(category.name)}`
            return (
              <Link
                key={category.id}
                href={href}
                className="group relative overflow-hidden rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-all duration-500 hover:scale-105 hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Background Image */}
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl">
                  <Image
                    src={category.image_url || 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&q=80'}
                    alt={category.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  {/* Photographic Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent transition-opacity duration-500 group-hover:from-black/55 rounded-2xl" />
                </div>

                {/* Content Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-end p-4 pb-6 lg:p-6 lg:pb-8">
                  {/* Icon with navy background */}
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#1C2E4A]/55 backdrop-blur-sm transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:bg-[#1C2E4A]/75">
                    <Icon className="h-6 w-6 text-[#C2A36B] transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  
                  {/* Title */}
                  <h3 className="mb-2 text-center font-serif text-base font-bold tracking-wide text-white/95 transition-all duration-300 lg:text-lg">
                    {category.name}
                  </h3>
                  <p className="text-center text-[10px] uppercase tracking-wider text-white/70 opacity-0 transition-opacity duration-300 group-hover:opacity-100 lg:text-xs">
                    {locale === 'id' ? category.description_id : category.description_en}
                  </p>

                  {/* Hover underline */}
                  <div className="mt-3 h-0.5 w-0 bg-[#C2A36B] transition-all duration-300 group-hover:w-14 rounded-full" />
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

