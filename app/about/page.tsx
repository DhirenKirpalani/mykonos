'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'

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
  const { t, locale } = useLanguage()
  const [cms, setCms] = useState<any>(null)

  useEffect(() => {
    fetch('/api/page-content/about')
      .then((r) => r.json())
      .then((d) => { if (d.success) setCms(d.content) })
      .catch(() => {})
  }, [])

  const c = cms?.[locale] || cms?.en || null

  const desktopBanner = c?.hero_desktop_image || '/assets/images/web about us banner.png'
  const mobileBanner = c?.hero_mobile_image || '/assets/images/mobile about us banner.png'
  const sections: any[] = c?.sections || []
  const ctaTitle = c?.cta_title || 'Designed to be Remembered'
  const ctaSubtitle = c?.cta_subtitle || 'Enter the world of MYKONOS fragrances'
  const ctaButton = c?.cta_button || t.about.shopNow

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative border-b border-luxury-gold/20 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 z-10 hidden md:block">
          <div className="container mx-auto px-4 py-3">
            <Breadcrumbs items={[{ label: 'About Us', href: '/about' }]} variant="light" />
          </div>
        </div>
        <img src={desktopBanner} alt="About Mykonos" className="hidden sm:block w-full h-[340px] sm:h-[400px] md:h-[480px] object-cover" />
        <img src={mobileBanner} alt="About Mykonos" className="block sm:hidden w-full h-[280px] object-cover" />
      </div>

      {/* Content Sections */}
      <div className="container mx-auto px-4 py-14 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-3xl">

          {sections.length > 0 ? (
            sections.map((section: any, idx: number) => (
              <div key={idx}>
                <section>
                  <p className="text-[10px] sm:text-xs font-medium uppercase tracking-[0.3em] text-luxury-gold mb-3">{section.number}</p>
                  <h2 className="font-montserrat text-3xl sm:text-4xl md:text-5xl font-bold text-luxury-navy mb-6 leading-tight">
                    {section.title}
                  </h2>
                  <div className="w-12 h-0.5 bg-luxury-gold mb-8" />
                  <div className="space-y-5 text-base sm:text-lg font-montserrat leading-relaxed text-gray-600">
                    {(section.paragraphs || []).map((para: string, pIdx: number) => (
                      <p key={pIdx}>{para}</p>
                    ))}
                  </div>
                </section>
                {idx < sections.length - 1 && <GoldDivider />}
              </div>
            ))
          ) : (
            <>
              <section>
                <p className="text-[10px] sm:text-xs font-medium uppercase tracking-[0.3em] text-luxury-gold mb-3">01</p>
                <h2 className="font-montserrat text-3xl sm:text-4xl md:text-5xl font-bold text-luxury-navy mb-6 leading-tight">{t.about.artOfPerfumery}</h2>
                <div className="w-12 h-0.5 bg-luxury-gold mb-8" />
                <div className="space-y-5 text-base sm:text-lg font-montserrat leading-relaxed text-gray-600">
                  <p>{t.about.artPara1}</p>
                  <p>{t.about.artPara2}</p>
                </div>
              </section>
              <GoldDivider />
              <section>
                <p className="text-[10px] sm:text-xs font-medium uppercase tracking-[0.3em] text-luxury-gold mb-3">02</p>
                <h2 className="font-montserrat text-3xl sm:text-4xl md:text-5xl font-bold text-luxury-navy mb-6 leading-tight">{t.about.craftsmanship}</h2>
                <div className="w-12 h-0.5 bg-luxury-gold mb-8" />
                <div className="space-y-5 text-base sm:text-lg font-montserrat leading-relaxed text-gray-600">
                  <p>{t.about.craftPara2}</p>
                  <p>{t.about.craftPara1}</p>
                </div>
              </section>
              <GoldDivider />
              <section>
                <p className="text-[10px] sm:text-xs font-medium uppercase tracking-[0.3em] text-luxury-gold mb-3">03</p>
                <h2 className="font-montserrat text-3xl sm:text-4xl md:text-5xl font-bold text-luxury-navy mb-6 leading-tight">{t.about.sustainability}</h2>
                <div className="w-12 h-0.5 bg-luxury-gold mb-8" />
                <div className="space-y-5 text-base sm:text-lg font-montserrat leading-relaxed text-gray-600">
                  <p>{t.about.sustainPara1} <strong>{locale === 'id' ? 'berani menjadi berbeda.' : 'dare to be different.'}</strong></p>
                  <p>{t.about.sustainPara2}</p>
                </div>
              </section>
            </>
          )}

          <GoldDivider />

          {/* CTA */}
          <section>
            <div className="relative overflow-hidden rounded-2xl bg-luxury-navy p-10 sm:p-14 text-center shadow-2xl">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(184,152,95,0.2)_0%,_transparent_60%)]" />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-luxury-gold/60 to-transparent" />
              <div className="relative">
                <h2 className="mb-4 font-playfair text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight">{ctaTitle}</h2>
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="h-px w-10 bg-luxury-gold/50" />
                  <div className="w-1 h-1 rounded-full bg-luxury-gold" />
                  <div className="h-px w-10 bg-luxury-gold/50" />
                </div>
                <p className="mb-8 text-sm sm:text-base font-montserrat text-white/70 max-w-xl mx-auto leading-relaxed">{ctaSubtitle}</p>
                <Link href="/products">
                  <Button className="bg-luxury-gold text-luxury-navy hover:bg-luxury-gold-light font-montserrat font-semibold px-10 py-6 text-sm sm:text-base uppercase tracking-widest shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5" size="lg">
                    {ctaButton}
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
