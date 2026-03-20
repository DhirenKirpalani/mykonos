'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/common'
import { Mail, Phone, MapPin } from 'lucide-react'
import { WhatsappLogo } from 'phosphor-react'
import { useLanguage } from '@/contexts/LanguageContext'

export default function ContactPage() {
  const { t } = useLanguage()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(false)
  }, [])

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-border/40 bg-luxury-gray-light py-8 sm:py-12">
        <div className="container mx-auto px-4 lg:px-8">
          <h1 className="mb-3 sm:mb-4 font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">
            {t.contact.title}
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
            {t.contact.subtitle}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 sm:py-12 lg:px-8">
        <div className="grid gap-8 sm:gap-12 lg:grid-cols-2">
          <div>
            <h2 className="mb-4 sm:mb-6 font-serif text-xl sm:text-2xl font-bold">{t.contact.sendMessage}</h2>
            <form className="space-y-6">
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-medium">
                  {t.contact.name}
                </label>
                <input
                  type="text"
                  id="name"
                  className="w-full rounded-md border border-input bg-background px-4 py-3 focus:border-luxury-gold focus:outline-none focus:ring-1 focus:ring-luxury-gold"
                  placeholder={t.contact.yourName}
                />
              </div>
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium">
                  {t.contact.email}
                </label>
                <input
                  type="email"
                  id="email"
                  className="w-full rounded-md border border-input bg-background px-4 py-3 focus:border-luxury-gold focus:outline-none focus:ring-1 focus:ring-luxury-gold"
                  placeholder={t.contact.yourEmail}
                />
              </div>
              <div>
                <label htmlFor="message" className="mb-2 block text-sm font-medium">
                  {t.contact.message}
                </label>
                <textarea
                  id="message"
                  rows={6}
                  className="w-full rounded-md border border-input bg-background px-4 py-3 focus:border-luxury-gold focus:outline-none focus:ring-1 focus:ring-luxury-gold"
                  placeholder={t.contact.yourMessage}
                />
              </div>
              <Button variant="luxury" size="lg" className="w-full">
                {t.contact.submit}
              </Button>
            </form>
          </div>

          <div className="space-y-6 sm:space-y-8">
            <div>
              <h2 className="mb-4 sm:mb-6 font-serif text-xl sm:text-2xl font-bold">{t.contact.getInTouch}</h2>
              <div className="space-y-4 sm:space-y-6">
                <a
                  href="https://wa.me/6285780218514"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 sm:gap-4 transition-opacity hover:opacity-80"
                >
                  <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-luxury-gold/10">
                    <WhatsappLogo className="h-5 w-5 sm:h-6 sm:w-6 text-luxury-gold" weight="fill" />
                  </div>
                  <div>
                    <p className="font-medium text-sm sm:text-base">{t.contact.whatsapp}</p>
                    <p className="text-muted-foreground text-sm">+62 857-8021-8514</p>
                  </div>
                </a>
              </div>
            </div>

            <div className="rounded-lg bg-luxury-gray-light p-4 sm:p-6">
              <h3 className="mb-3 sm:mb-4 font-serif text-lg sm:text-xl font-bold">{t.contact.businessHours}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.contact.mondayFriday}</span>
                  <span>{t.contact.hours.weekday}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.contact.saturday}</span>
                  <span>{t.contact.hours.saturday}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.contact.sunday}</span>
                  <span>{t.contact.closed}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
