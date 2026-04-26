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
    <div className="bg-luxury-gray-light border-t border-gray-200 py-8 sm:py-12" style={{ minHeight: '320px' }}>
      <div className="max-w-4xl mx-auto text-center px-4">
        <div className="flex justify-center mb-3 sm:mb-4">
          <div className="bg-luxury-gold/10 p-2 sm:p-3 rounded-full">
            <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-luxury-gold" />
          </div>
        </div>
        
        <h3 className="font-serif text-xl sm:text-2xl md:text-3xl font-medium text-luxury-navy mb-2">
          {t.newsletter.title}
        </h3>
        <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto">
          {t.newsletter.description}
        </p>

        {success ? (
          <div className="flex items-center justify-center gap-2 text-sm sm:text-base text-green-700 bg-green-50 rounded-lg p-3 sm:p-4 max-w-md mx-auto">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            <span className="font-medium">{t.newsletter.successMessage}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.newsletter.placeholder}
              className="w-full px-4 py-3 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-luxury-gold focus:border-luxury-gold"
              disabled={loading}
              required={false}
            />

            <label className="flex items-start gap-2.5 text-left cursor-pointer">
              <input
                type="checkbox"
                id="newsletter-consent"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-luxury-gold border-gray-300 rounded focus:ring-luxury-gold flex-shrink-0"
                disabled={loading}
                required={false}
              />
              <span className="text-xs text-gray-600 leading-relaxed">
                {t.newsletter.consent}{' '}
                <a href="/privacy" className="text-luxury-gold hover:underline">
                  {t.newsletter.privacyPolicy}
                </a>
                {t.newsletter.consentSuffix}
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-sm bg-luxury-gold hover:bg-luxury-gold-light disabled:bg-gray-400 disabled:cursor-not-allowed text-luxury-navy font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t.newsletter.subscribing}
                </>
              ) : (
                t.newsletter.button
              )}
            </button>

            <p className="text-xs text-gray-500 text-center">
              {t.newsletter.privacyNotice}
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
