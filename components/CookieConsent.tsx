'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent')
    if (!consent) {
      setIsVisible(true)
    }
  }, [])

  const handleAcceptAll = () => {
    localStorage.setItem('cookie-consent', 'all')
    setIsVisible(false)
  }

  const handleRejectAll = () => {
    localStorage.setItem('cookie-consent', 'necessary')
    setIsVisible(false)
  }

  const handleSettings = () => {
    // Open cookie settings modal
    console.log('Open cookie settings')
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-2xl rounded-lg bg-white p-8 shadow-2xl">
        <button
          onClick={() => setIsVisible(false)}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="mb-4 font-serif text-2xl font-bold">Your privacy is important to us.</h2>
        
        <div className="mb-6 space-y-3 text-sm text-gray-600">
          <p>
            Our site and our third party partners use cookies, for performance purposes and to offer you a 
            personalized experience by sending advertisements in line with your browsing preferences.
          </p>
          <p>
            This means we can remember details, show you products of interest and continually improve our 
            site. You can manage your cookie settings at any time by visiting our "Cookie Policy" and following the 
            instructions indicated therein.
          </p>
          <p>
            By clicking on "Accept all cookies", you agree to the storing of cookies on your device.
          </p>
          <p>
            By clicking on "Reject all cookies", the cookies for which consent is required will not be stored on your device. 
            For more information consult our{' '}
            <a href="/privacy" className="text-luxury-gold hover:underline">
              Cookie Policy
            </a>
            .
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={handleRejectAll}
            variant="outline"
            className="flex-1 border-2 border-gray-900 bg-white text-gray-900 hover:bg-gray-50"
          >
            Reject all Cookies
          </Button>
          <Button
            onClick={handleAcceptAll}
            className="flex-1 bg-gray-900 text-white hover:bg-gray-800"
          >
            Accept all Cookies
          </Button>
          <Button
            onClick={handleSettings}
            variant="outline"
            className="flex-1 border-2 border-gray-900 bg-white text-gray-900 hover:bg-gray-50"
          >
            Cookies Settings
          </Button>
        </div>
      </div>
    </div>
  )
}
