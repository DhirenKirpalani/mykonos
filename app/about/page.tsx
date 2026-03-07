'use client'

import Image from 'next/image'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'

export default function AboutPage() {
  const { t } = useLanguage()
  return (
    <div className="min-h-screen bg-white">
      <div className="relative h-[500px] overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=1200"
          alt="About Mykonos"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute inset-0 flex items-end">
          <div className="container mx-auto px-4 pb-16 lg:px-8">
            <h1 className="mb-4 font-serif text-5xl font-bold text-white lg:text-7xl">
              {t.about.title}
            </h1>
            <p className="max-w-2xl text-xl text-white/90">
              {t.about.subtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-12">
          <section>
            <h2 className="mb-6 font-serif text-3xl font-bold">
              {t.about.artOfPerfumery}
            </h2>
            <div className="space-y-4 text-lg text-muted-foreground">
              <p>
                {t.about.artPara1}
              </p>
              <p>
                {t.about.artPara2}
              </p>
            </div>
          </section>

          <section id="craftsmanship" className="border-t border-border/40 pt-12">
            <h2 className="mb-6 font-serif text-3xl font-bold">{t.about.craftsmanship}</h2>
            <div className="space-y-4 text-lg text-muted-foreground">
              <p>
                {t.about.craftPara1}
              </p>
              <p>
                {t.about.craftPara2}
              </p>
            </div>
          </section>

          <section id="sustainability" className="border-t border-border/40 pt-12">
            <h2 className="mb-6 font-serif text-3xl font-bold">{t.about.sustainability}</h2>
            <div className="space-y-4 text-lg text-muted-foreground">
              <p>
                {t.about.sustainPara1}
              </p>
              <p>
                {t.about.sustainPara2}
              </p>
            </div>
          </section>

          <section className="border-t border-border/40 pt-12">
            <div className="rounded-lg bg-luxury-gray-light p-8 text-center">
              <h2 className="mb-4 font-serif text-3xl font-bold">
                {t.about.experienceDiff}
              </h2>
              <p className="mb-6 text-lg text-muted-foreground">
                {t.about.discoverCollection}
              </p>
              <Link href="/products">
                <Button variant="luxury" size="lg">
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
