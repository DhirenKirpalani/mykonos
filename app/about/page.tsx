'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { Breadcrumb } from '@/components/breadcrumb'

const GoldDivider = () => (
  <div className="flex items-center justify-center gap-4 my-10 sm:my-14">
    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-luxury-gold/40" />
    <div className="flex items-center gap-1.5">
      <div className="w-1 h-1 rounded-full bg-luxury-gold/60" />
      <div className="w-2 h-2 rounded-full bg-luxury-gold" />
      <div className="w-1 h-1 rounded-full bg-luxury-gold/60" />
    </div>
    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-luxury-gold/40" />
  </div>
)

export default function AboutPage() {
  const { t } = useLanguage()
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-white border-b border-gray-200 relative">
        {/* Breadcrumb - Desktop only */}
        <div className="border-b border-gray-200 hidden md:block">
          <div className="container mx-auto px-4 py-3">
            <Breadcrumb 
              items={[
                { label: t.nav?.aboutUs || 'About Us', href: '/about' }
              ]}
            />
          </div>
        </div>
        
        {/* Hero Content */}
        <div className="relative h-[340px] sm:h-[400px] md:h-[480px] overflow-hidden">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_rgba(184,152,95,0.04)_1px,_transparent_0)] bg-[length:36px_36px]" />
          
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <p className="mb-3 text-[10px] sm:text-xs font-medium uppercase tracking-[0.35em] text-luxury-gold">
            MYKONOS
          </p>
          <h1 className="mb-4 font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-luxury-navy leading-tight">
            {t.about.title}
          </h1>
          {/* Thin gold rule under title */}
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px w-12 sm:w-20 bg-luxury-gold" />
            <div className="w-1.5 h-1.5 rounded-full bg-luxury-gold" />
            <div className="h-px w-12 sm:w-20 bg-luxury-gold" />
          </div>
          <p className="max-w-xl text-base sm:text-lg text-gray-600 leading-relaxed font-light tracking-wide">
            {t.about.subtitle}
          </p>
          </div>
        </div>
      </div>

      {/* Pillars / Stats Bar */}
      <div className="bg-luxury-navy/5 border-y border-luxury-gold/15">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-3 divide-x divide-luxury-gold/15">
            {[
              { number: '100%', label: 'Handcrafted' },
              { number: 'Rare', label: 'Ingredients' },
              { number: 'Timeless', label: 'Fragrance' },
            ].map((stat) => (
              <div key={stat.label} className="py-6 sm:py-8 text-center px-2">
                <p className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-luxury-navy mb-1">{stat.number}</p>
                <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-luxury-gold font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="container mx-auto px-4 py-14 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-3xl">

          {/* Art of Perfumery */}
          <section>
            <p className="text-[10px] sm:text-xs font-medium uppercase tracking-[0.3em] text-luxury-gold mb-3">01</p>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-luxury-navy mb-6 leading-tight">
              {t.about.artOfPerfumery}
            </h2>
            <div className="w-12 h-0.5 bg-luxury-gold mb-8" />
            <div className="space-y-5 text-base sm:text-lg leading-relaxed text-gray-600">
              <p>{t.about.artPara1}</p>
              <p>{t.about.artPara2}</p>
            </div>
            {/* Pull quote */}
            <blockquote className="mt-8 border-l-2 border-luxury-gold pl-6 py-1">
              <p className="font-serif text-xl sm:text-2xl italic text-luxury-navy/80 leading-relaxed">
                "Each scent is a masterpiece, crafted to evoke emotions and create lasting memories."
              </p>
            </blockquote>
          </section>

          <GoldDivider />

          {/* Craftsmanship */}
          <section id="craftsmanship">
            <p className="text-[10px] sm:text-xs font-medium uppercase tracking-[0.3em] text-luxury-gold mb-3">02</p>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-luxury-navy mb-6 leading-tight">
              {t.about.craftsmanship}
            </h2>
            <div className="w-12 h-0.5 bg-luxury-gold mb-8" />
            <div className="space-y-5 text-base sm:text-lg leading-relaxed text-gray-600">
              <p>{t.about.craftPara1}</p>
              <p>{t.about.craftPara2}</p>
            </div>
            {/* Feature highlight cards */}
            <div className="mt-10 grid grid-cols-2 gap-4">
              {[
                { title: 'Rare Oud Wood', desc: 'Sourced from the finest forests across the Middle East' },
                { title: 'Rose Absolutes', desc: 'Precious petals harvested at dawn for maximum potency' },
              ].map((item) => (
                <div key={item.title} className="bg-luxury-navy/3 border border-luxury-gold/20 rounded-xl p-5 sm:p-6">
                  <div className="w-6 h-px bg-luxury-gold mb-3" />
                  <h4 className="font-serif text-base sm:text-lg font-semibold text-luxury-navy mb-2">{item.title}</h4>
                  <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <GoldDivider />

          {/* Sustainability */}
          <section id="sustainability">
            <p className="text-[10px] sm:text-xs font-medium uppercase tracking-[0.3em] text-luxury-gold mb-3">03</p>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-luxury-navy mb-6 leading-tight">
              {t.about.sustainability}
            </h2>
            <div className="w-12 h-0.5 bg-luxury-gold mb-8" />
            <div className="space-y-5 text-base sm:text-lg leading-relaxed text-gray-600">
              <p>{t.about.sustainPara1}</p>
              <p>{t.about.sustainPara2}</p>
            </div>
          </section>

          <GoldDivider />

          {/* CTA Section */}
          <section>
            <div className="relative overflow-hidden rounded-2xl bg-luxury-navy p-10 sm:p-14 text-center shadow-2xl">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(184,152,95,0.2)_0%,_transparent_60%)]" />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-luxury-gold/60 to-transparent" />
              <div className="relative">
                <p className="text-[10px] sm:text-xs font-medium uppercase tracking-[0.3em] text-luxury-gold/70 mb-4">
                  EXPLORE THE COLLECTION
                </p>
                <h2 className="mb-4 font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight">
                  {t.about.experienceDiff}
                </h2>
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="h-px w-10 bg-luxury-gold/50" />
                  <div className="w-1 h-1 rounded-full bg-luxury-gold" />
                  <div className="h-px w-10 bg-luxury-gold/50" />
                </div>
                <p className="mb-8 text-sm sm:text-base text-white/70 max-w-xl mx-auto leading-relaxed">
                  {t.about.discoverCollection}
                </p>
                <Link href="/products">
                  <Button
                    className="bg-luxury-gold text-luxury-navy hover:bg-luxury-gold-light font-semibold px-10 py-6 text-sm sm:text-base uppercase tracking-widest shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                    size="lg"
                  >
                    {t.about.shopNow}
                  </Button>
                </Link>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
