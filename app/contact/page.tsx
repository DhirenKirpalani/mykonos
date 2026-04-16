'use client'

import { useState } from 'react'
import { WhatsappLogo } from 'phosphor-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'

export default function ContactPage() {
  const { t } = useLanguage()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  })

  const whatsappMessageID = encodeURIComponent('Halo! Saya ingin bertanya tentang produk Anda.')
  const whatsappMessageEN = encodeURIComponent('Hello! I would like to inquire about your products.')
  const whatsappUrl = `https://wa.me/6285780218514?text=${whatsappMessageID}`
  const internationalWhatsappUrl = `https://wa.me/6281626178?text=${whatsappMessageEN}`

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Create mailto link with prefilled subject and body
    const subject = encodeURIComponent('Inquiry from Mykonos Website')
    const body = encodeURIComponent(
      `Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`
    )
    const mailtoLink = `mailto:officialmykonos@outlook.com?subject=${subject}&body=${body}`
    
    // Open email client
    window.open(mailtoLink, '_blank')
    
    // Show success message and reset form
    toast.success(t.contact.messageSent)
    setFormData({ name: '', email: '', message: '' })
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
            <div className="rounded-2xl bg-luxury-gray-light p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    {t.contact.name}
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
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
                    type="email"
                    id="email"
                    required
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
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder={t.contact.yourMessage}
                    rows={6}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20 transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-luxury-gold hover:bg-luxury-gold/90 text-white font-semibold py-3 px-6 rounded-lg transition-all hover:shadow-lg active:scale-[0.98]"
                >
                  {t.contact.submit}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column - WhatsApp & Business Hours */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-serif font-bold mb-6">{t.contact.getInTouch}</h2>
              
              {/* WhatsApp Cards */}
              <div className="space-y-4">
                {/* Indonesia WhatsApp */}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl bg-[#25D366] p-5 transition-all hover:bg-[#20BD5A] hover:shadow-xl active:scale-[0.98] border-2 border-[#1DA851]"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
                      <WhatsappLogo className="h-8 w-8 text-white" weight="fill" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full">Indonesia</span>
                      </div>
                      <p className="font-bold text-white text-base mb-0.5">WhatsApp Indonesia</p>
                      <p className="text-white/90 text-sm font-medium">+62 857-8021-8514</p>
                      <p className="text-white/70 text-xs mt-1">{t.contact.tapToChat}</p>
                    </div>
                  </div>
                </a>

                {/* International WhatsApp */}
                <a
                  href={internationalWhatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl bg-gradient-to-r from-[#0078D4] to-[#0063B1] p-5 transition-all hover:from-[#106EBE] hover:to-[#005A9E] hover:shadow-xl active:scale-[0.98] border-2 border-[#005A9E]"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
                      <WhatsappLogo className="h-8 w-8 text-white" weight="fill" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full">International</span>
                      </div>
                      <p className="font-bold text-white text-base mb-0.5">WhatsApp International</p>
                      <p className="text-white/90 text-sm font-medium">+62 816-261-783</p>
                      <p className="text-white/70 text-xs mt-1">{t.contact.tapToChat}</p>
                    </div>
                  </div>
                </a>
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
