'use client'

import { useState, useEffect } from 'react'
import { WhatsappLogo } from 'phosphor-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useRegion } from '@/contexts/RegionContext'
import { toast } from 'sonner'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'

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
      toast.error(t.contact.enterName)
      return
    }

    if (!formData.email.trim()) {
      toast.error(t.contact.enterEmail)
      return
    }

    if (!validateEmail(formData.email)) {
      toast.error(t.contact.validEmail)
      return
    }

    if (!formData.message.trim()) {
      toast.error(t.contact.enterMessage)
      return
    }

    if (formData.message.trim().length < 10) {
      toast.error(t.contact.messageLength)
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

  const whatsappHref = clientRegion === 'ID' ? whatsappUrlID : whatsappUrlInternational
  const whatsappNumber = clientRegion === 'ID' ? '+62 857-8021-8514' : '+62 816-261-783'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Luxury Hero Header */}
      <div className="bg-white border-b border-gray-100 relative">
        {/* Breadcrumb - Desktop only */}
        <div className="border-b border-gray-100 hidden md:block">
          <div className="container mx-auto px-4 lg:px-8 py-3">
            <Breadcrumbs 
              items={[
                { label: t.contact.title, href: '/contact' }
              ]} 
            />
          </div>
        </div>
        
        <div className="container mx-auto px-4 lg:px-8 pt-12 pb-10 md:pt-16 md:pb-12 text-center">
          <h1 className="font-montserrat text-3xl sm:text-4xl md:text-5xl font-bold text-luxury-navy mb-4">
            {t.contact.title}
          </h1>
          <p className="font-montserrat text-sm text-gray-500 tracking-wide max-w-md mx-auto">{t.contact.subtitle}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 sm:py-16 lg:px-8 font-montserrat">
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-12 lg:gap-20 max-w-5xl mx-auto">

          {/* Left — WhatsApp & Business Hours */}
          <div className="space-y-12 order-1 lg:order-none">

            {/* WhatsApp */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#B8985F] mb-3">Direct Chat</p>
              <h2 className="font-playfair text-xl font-light text-luxury-navy mb-6">WhatsApp</h2>
              {clientRegion === null ? (
                <div className="h-16 animate-pulse bg-gray-100 rounded" />
              ) : (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 border border-gray-200 px-5 py-4 transition-all hover:border-[#B8985F] hover:shadow-sm group"
                >
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1A56DB] via-[#1E3A8A] to-[#B8985F]">
                    <WhatsappLogo className="h-5 w-5 text-white" weight="fill" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-luxury-navy tracking-wide">{whatsappNumber}</p>
                    <p className="text-xs text-gray-400 tracking-wide">{t.contact.tapToChat}</p>
                  </div>
                  <span className="ml-auto text-gray-300 group-hover:text-[#B8985F] transition-colors text-lg">›</span>
                </a>
              )}
            </div>

            {/* Business Hours */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#B8985F] mb-3">Schedule</p>
              <h2 className="font-playfair text-xl font-light text-luxury-navy mb-6">{t.contact.businessHours}</h2>
              <div className="space-y-0">
                <div className="flex justify-between items-center py-3.5 border-b border-gray-100">
                  <span className="text-sm text-gray-500">{t.contact.mondayFriday}</span>
                  <span className="text-sm font-medium text-luxury-navy">{t.contact.hours.weekday}</span>
                </div>
                <div className="flex justify-between items-center py-3.5 border-b border-gray-100">
                  <span className="text-sm text-gray-500">{t.contact.saturday}</span>
                  <span className="text-sm font-medium text-luxury-navy">{t.contact.hours.saturday}</span>
                </div>
                <div className="flex justify-between items-center py-3.5">
                  <span className="text-sm text-gray-500">{t.contact.sunday}</span>
                  <span className="text-sm font-medium text-gray-400 italic">{t.contact.closed}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right — Email Form */}
          <div className="order-2 lg:order-none">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#B8985F] mb-3">Get In Touch</p>
            <h2 className="font-playfair text-xl font-light text-luxury-navy mb-8">Email</h2>
            <form onSubmit={handleSubmit} className="space-y-7">
              {[
                { id: 'name', label: t.contact.name, placeholder: t.contact.yourName, value: formData.name, type: 'text', onChange: (v: string) => setFormData({ ...formData, name: v }) },
                { id: 'email', label: t.contact.email, placeholder: t.contact.yourEmail, value: formData.email, type: 'text', onChange: (v: string) => setFormData({ ...formData, email: v }) },
              ].map(({ id, label, placeholder, value, type, onChange }) => (
                <div key={id}>
                  <label htmlFor={id} className="block text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-2">{label}</label>
                  <div className="border-b border-gray-200 focus-within:border-[#B8985F] transition-colors">
                    <input
                      type={type}
                      id={id}
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                      placeholder={placeholder}
                      className="w-full bg-transparent py-2.5 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none"
                    />
                  </div>
                </div>
              ))}

              <div>
                <label htmlFor="message" className="block text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-2">{t.contact.message}</label>
                <div className="border-b border-gray-200 focus-within:border-[#B8985F] transition-colors">
                  <textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder={t.contact.yourMessage}
                    rows={5}
                    className="w-full bg-transparent py-2.5 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none resize-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-luxury-navy text-white text-xs font-montserrat font-semibold uppercase tracking-wider py-3.5 transition-all hover:bg-luxury-navy/90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? t.contact.sending : t.contact.submit}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
