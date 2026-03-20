'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'

export default function AboutPage() {
  const { t } = useLanguage()
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Luxury Theme */}
      <div className="relative h-[280px] sm:h-[320px] md:h-[360px] overflow-hidden bg-luxury-navy">
        <div className="absolute inset-0 bg-gradient-to-br from-luxury-navy via-luxury-navy to-[#0F1B2E]" />
        <div className="absolute inset-0 flex items-center">
          <div className="container mx-auto px-4 lg:px-8">
            <h1 className="mb-3 sm:mb-4 font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-luxury-gold">
              {t.about.title}
            </h1>
            <p className="max-w-2xl text-base sm:text-lg md:text-xl text-white/90">
              {t.about.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Content Sections with Luxury Styling */}
      <div className="container mx-auto px-4 py-12 sm:py-16 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-4xl space-y-12 sm:space-y-16">
          {/* Art of Perfumery */}
          <section>
            <h2 className="mb-4 sm:mb-6 font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-luxury-navy">
              {t.about.artOfPerfumery}
            </h2>
            <div className="space-y-4 sm:space-y-6 text-base sm:text-lg leading-relaxed text-gray-700">
              <p>
                {t.about.artPara1}
              </p>
              <p>
                {t.about.artPara2}
              </p>
            </div>
          </section>

          {/* Craftsmanship */}
          <section id="craftsmanship" className="border-t-2 border-luxury-gold/20 pt-12">
            <h2 className="mb-4 sm:mb-6 font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-luxury-navy">
              {t.about.craftsmanship}
            </h2>
            <div className="space-y-4 sm:space-y-6 text-base sm:text-lg leading-relaxed text-gray-700">
              <p>
                {t.about.craftPara1}
              </p>
              <p>
                {t.about.craftPara2}
              </p>
            </div>
          </section>

          {/* Sustainability */}
          <section id="sustainability" className="border-t-2 border-luxury-gold/20 pt-12">
            <h2 className="mb-4 sm:mb-6 font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-luxury-navy">
              {t.about.sustainability}
            </h2>
            <div className="space-y-4 sm:space-y-6 text-base sm:text-lg leading-relaxed text-gray-700">
              <p>
                {t.about.sustainPara1}
              </p>
              <p>
                {t.about.sustainPara2}
              </p>
            </div>
          </section>

          {/* CTA Section */}
          <section className="border-t-2 border-luxury-gold/20 pt-12">
            <div className="rounded-2xl bg-luxury-navy p-8 sm:p-12 text-center shadow-xl">
              <h2 className="mb-4 font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-luxury-gold">
                {t.about.experienceDiff}
              </h2>
              <p className="mb-6 sm:mb-8 text-base sm:text-lg text-white/90 max-w-2xl mx-auto">
                {t.about.discoverCollection}
              </p>
              <Link href="/products">
                <Button 
                  className="bg-luxury-gold text-luxury-navy hover:bg-luxury-gold/90 font-medium px-8 py-6 text-base sm:text-lg"
                  size="lg"
                >
                  {t.about.shopNow}
                </Button>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
