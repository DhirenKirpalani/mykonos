'use client'

import { WhatsappLogo } from 'phosphor-react'
import { useLanguage } from '@/contexts/LanguageContext'

export default function ContactPage() {
  const { t } = useLanguage()
  const whatsappMessage = encodeURIComponent(t.contact.whatsappMessage || 'Hello, I would like to inquire about...')
  const whatsappUrl = `https://wa.me/6285780218514?text=${whatsappMessage}`

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-border/40 bg-luxury-gray-light py-12 sm:py-16">
        <div className="container mx-auto px-4 lg:px-8">
          <h1 className="mb-4 font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-center">
            {t.contact.title}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground text-center max-w-2xl mx-auto">
            {t.contact.subtitle}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-lg">
          <div className="space-y-8">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl bg-[#25D366] p-5 transition-all hover:bg-[#20BD5A] hover:shadow-xl active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
                  <WhatsappLogo className="h-7 w-7 text-white" weight="fill" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white text-lg mb-0.5">{t.contact.whatsapp}</p>
                  <p className="text-white/90 text-sm">+62 857-8021-8514</p>
                  <p className="text-white/80 text-xs mt-1">{t.contact.tapToChat}</p>
                </div>
              </div>
            </a>

            <div className="rounded-2xl bg-luxury-gray-light p-8">
              <h3 className="mb-6 font-serif text-xl font-bold text-center">{t.contact.businessHours}</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-border/30">
                  <span className="text-muted-foreground font-medium">{t.contact.mondayFriday}</span>
                  <span className="font-semibold text-luxury-navy">{t.contact.hours.weekday}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/30">
                  <span className="text-muted-foreground font-medium">{t.contact.saturday}</span>
                  <span className="font-semibold text-luxury-navy">{t.contact.hours.saturday}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground font-medium">{t.contact.sunday}</span>
                  <span className="font-semibold text-red-600">{t.contact.closed}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
