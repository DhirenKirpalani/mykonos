'use client'

import { useState, useEffect } from 'react'
import { WhatsappLogo } from 'phosphor-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useRegion } from '@/contexts/RegionContext'
import { toast } from 'sonner'

export default function ContactPage() {
  const { t } = useLanguage()
  const { region } = useRegion()
  const [clientRegion, setClientRegion] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Only set region after mount to prevent hydration mismatch
  useEffect(() => {
    setClientRegion(region?.code || null)
  }, [region])

  const whatsappMessageID = encodeURIComponent('Halo! Saya ingin bertanya tentang produk Anda.')
  const whatsappMessageEN = encodeURIComponent('Hello! I would like to inquire about your products.')
  const whatsappUrlID = `https://wa.me/6285780218514?text=${whatsappMessageID}`
  const whatsappUrlInternational = `https://wa.me/62816261783?text=${whatsappMessageEN}`

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Client-side validation
    if (!formData.name.trim()) {
      toast.error('Please enter your name')
      return
    }

    if (!formData.email.trim()) {
      toast.error('Please enter your email')
      return
    }

    if (!validateEmail(formData.email)) {
      toast.error('Please enter a valid email address')
      return
    }

    if (!formData.message.trim()) {
      toast.error('Please enter your message')
      return
    }

    if (formData.message.trim().length < 10) {
      toast.error('Message must be at least 10 characters long')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      toast.success(t.contact.messageSent || 'Message sent successfully!')
      setFormData({ name: '', email: '', message: '' })
    } catch (error) {
      console.error('Contact form error:', error)
      toast.error(error instanceof Error ? error.message : (t.contact.messageError || 'Failed to send message. Please try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 max-w-6xl mx-auto">
          {/* Left Column - Contact Form */}
          <div>
            <h2 className="text-2xl font-serif font-bold mb-6">Email</h2>
            <div className="rounded-2xl bg-luxury-gray-light p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    {t.contact.name}
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t.contact.yourName}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    {t.contact.email}
                  </label>
                  <input
                    type="text"
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder={t.contact.yourEmail}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    {t.contact.message}
                  </label>
                  <textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder={t.contact.yourMessage}
                    rows={6}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20 transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-luxury-gold hover:bg-luxury-gold/90 text-white font-semibold py-3 px-6 rounded-lg transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? t.contact.sending : t.contact.submit}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column - WhatsApp & Business Hours */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-serif font-bold mb-6">WhatsApp</h2>
              
              {/* WhatsApp Cards */}
              <div className="space-y-4">
                {clientRegion === null ? (
                  /* Show placeholder during SSR and initial render to prevent hydration mismatch */
                  <div className="block rounded-xl bg-[#25D366] p-5 border-2 border-[#1DA851]">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
                        <WhatsappLogo className="h-8 w-8 text-white" weight="fill" />
                      </div>
                      <div className="flex-1">
                        <div className="h-6 bg-white/30 rounded w-48 mb-1 animate-pulse"></div>
                        <div className="h-4 bg-white/20 rounded w-32 animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                ) : clientRegion === 'ID' ? (
                  /* Indonesia WhatsApp - Green for ID region only */
                  <a
                    href={whatsappUrlID}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-xl bg-[#25D366] p-5 transition-all hover:bg-[#20BD5A] hover:shadow-xl active:scale-[0.98] border-2 border-[#1DA851]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
                        <WhatsappLogo className="h-8 w-8 text-white" weight="fill" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-white text-lg mb-0.5">+62 857-8021-8514</p>
                        <p className="text-white/80 text-sm">{t.contact.tapToChat}</p>
                      </div>
                    </div>
                  </a>
                ) : (
                  /* International WhatsApp - Green for non-ID regions only */
                  <a
                    href={whatsappUrlInternational}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-xl bg-[#25D366] p-5 transition-all hover:bg-[#20BD5A] hover:shadow-xl active:scale-[0.98] border-2 border-[#1DA851]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
                        <WhatsappLogo className="h-8 w-8 text-white" weight="fill" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-white text-lg mb-0.5">+62 816-261-783</p>
                        <p className="text-white/80 text-sm">{t.contact.tapToChat}</p>
                      </div>
                    </div>
                  </a>
                )}
              </div>
            </div>

            {/* Business Hours */}
            <div className="rounded-2xl bg-luxury-gray-light p-6 sm:p-8">
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
