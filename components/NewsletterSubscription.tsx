'use client'

import { useState } from 'react'
import { Mail, Loader2, CheckCircle2 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'

export default function NewsletterSubscription() {
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccess(false)

    // Validate all fields and show the most appropriate error
    if (!email) {
      toast.error(t.newsletter.emailRequired, {
        description: t.newsletter.errorEmail
      })
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error(t.newsletter.invalidEmail, {
        description: t.newsletter.errorEmail
      })
      return
    }

    if (!consent) {
      toast.error(t.newsletter.consentRequired, {
        description: t.newsletter.errorConsent
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, consent }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t.newsletter.errorGeneric)
      }

      setSuccess(true)
      setEmail('')
      setConsent(false)
      
      toast.success(t.newsletter.subscribed, {
        description: t.newsletter.successMessage
      })
      
      setTimeout(() => {
        setSuccess(false)
      }, 5000)
    } catch (err: any) {
      toast.error(t.newsletter.subscriptionFailed, {
        description: err.message || t.newsletter.errorGeneric
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="relative bg-white py-12 sm:py-16 overflow-hidden">
      {/* Elegant background pattern */}
      <div className="absolute inset-0 bg-gradient-to-b from-luxury-gray-light/30 via-white to-luxury-gray-light/30" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_rgba(198,159,112,0.04)_1px,_transparent_0)] bg-[length:40px_40px]" />
      
      <div className="relative max-w-2xl mx-auto text-center px-4 sm:px-6">
        {/* Icon with elegant styling */}
        <div className="flex justify-center mb-4 sm:mb-5">
          <div className="relative">
            <div className="absolute inset-0 bg-luxury-gold/20 blur-lg rounded-full" />
            <div className="relative bg-gradient-to-br from-luxury-gold to-luxury-gold-light p-3 sm:p-3.5 rounded-xl shadow-lg">
              <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={1.5} />
            </div>
          </div>
        </div>
        
        {/* Title with luxury typography */}
        <h2 className="font-montserrat text-2xl sm:text-3xl font-bold text-luxury-navy mb-3 tracking-tight">
          {t.newsletter.title}
        </h2>
        
        {/* Description with refined spacing */}
        <p className="font-montserrat text-sm sm:text-base text-gray-600 mb-6 sm:mb-8 max-w-xl mx-auto leading-relaxed">
          {t.newsletter.description}
        </p>

        {success ? (
          <div className="flex items-center justify-center gap-2.5 text-sm sm:text-base text-green-700 bg-green-50 border border-green-200 rounded-xl p-4 sm:p-5 max-w-lg mx-auto shadow-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span className="font-montserrat font-medium">{t.newsletter.successMessage}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-4">
            {/* Email input with luxury styling */}
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.newsletter.placeholder}
                className="font-montserrat w-full px-5 py-3.5 text-sm sm:text-base rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-luxury-gold/50 focus:border-luxury-gold transition-all duration-200 shadow-sm hover:border-gray-300"
                disabled={loading}
                required={false}
              />
            </div>

            {/* Consent checkbox with refined styling */}
            <label className="flex items-start gap-2.5 text-left cursor-pointer group">
              <input
                type="checkbox"
                id="newsletter-consent"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-luxury-gold border-gray-300 rounded focus:ring-luxury-gold flex-shrink-0 cursor-pointer"
                disabled={loading}
                required={false}
              />
              <span className="font-montserrat text-xs sm:text-sm text-gray-600 leading-relaxed group-hover:text-gray-900 transition-colors">
                {t.newsletter.consent}{' '}
                <a href="/privacy" className="text-luxury-gold hover:text-luxury-gold-light underline decoration-luxury-gold/30 hover:decoration-luxury-gold transition-colors">
                  {t.newsletter.privacyPolicy}
                </a>
                {t.newsletter.consentSuffix}
              </span>
            </label>

            {/* Subscribe button with luxury styling */}
            <button
              type="submit"
              disabled={loading}
              className="font-montserrat w-full py-3.5 text-sm sm:text-base bg-luxury-gold hover:bg-luxury-gold-light disabled:bg-gray-300 disabled:cursor-not-allowed text-luxury-navy font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  {t.newsletter.subscribing}
                </>
              ) : (
                t.newsletter.button
              )}
            </button>

            {/* Privacy notice with subtle styling */}
            <p className="font-montserrat text-xs text-gray-500 text-center pt-1">
              {t.newsletter.privacyNotice}
            </p>
          </form>
        )}
      </div>
    </section>
  )
}
