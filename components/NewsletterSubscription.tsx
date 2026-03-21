'use client'

import { useState, useEffect } from 'react'
import { Mail, Loader2, CheckCircle2, X, AlertCircle } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export default function NewsletterSubscription() {
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [showError, setShowError] = useState(false)

  useEffect(() => {
    if (error) {
      setShowError(true)
      const timer = setTimeout(() => {
        setShowError(false)
        setTimeout(() => setError(''), 300)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!consent) {
      setError(t.newsletter.errorConsent)
      return
    }

    if (!email) {
      setError(t.newsletter.errorEmail)
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
      
      setTimeout(() => {
        setSuccess(false)
      }, 5000)
    } catch (err: any) {
      setError(err.message || t.newsletter.errorGeneric)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-luxury-gray-light border-t border-gray-200 py-8 sm:py-12">
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
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.newsletter.placeholder}
                className="flex-1 px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base rounded-md border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-luxury-gold focus:border-luxury-gold"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 sm:px-8 sm:py-3 text-sm sm:text-base bg-luxury-gold hover:bg-luxury-gold-light disabled:bg-gray-400 disabled:cursor-not-allowed text-luxury-navy font-medium rounded-md transition-colors duration-200 flex items-center justify-center gap-2 whitespace-nowrap"
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
            </div>

            <div className="flex items-start gap-2 text-left">
              <input
                type="checkbox"
                id="newsletter-consent"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 sm:mt-1 w-4 h-4 text-luxury-gold border-gray-300 rounded focus:ring-luxury-gold flex-shrink-0"
                disabled={loading}
              />
              <label htmlFor="newsletter-consent" className="text-xs sm:text-sm text-gray-600">
                {t.newsletter.consent}{' '}
                <a href="/privacy" className="text-luxury-gold hover:underline">
                  {t.newsletter.privacyPolicy}
                </a>
                {t.newsletter.consentSuffix}
              </label>
            </div>
          </form>
        )}

        <p className="text-xs text-gray-500 mt-3 sm:mt-4">
          {t.newsletter.privacyNotice}
        </p>
      </div>

      {/* Error Toast Notification */}
      {error && (
        <div 
          className={`fixed bottom-4 right-4 z-50 max-w-sm transition-all duration-300 ${
            showError ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
          }`}
        >
          <div className="bg-red-600 text-white rounded-lg shadow-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">{error}</p>
            </div>
            <button
              onClick={() => {
                setShowError(false)
                setTimeout(() => setError(''), 300)
              }}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
