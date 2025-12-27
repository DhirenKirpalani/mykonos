'use client'

import { useState, useEffect } from 'react'
import { useAccessibility } from '@/contexts/AccessibilityContext'
import { motion, AnimatePresence } from 'framer-motion'

export function AccessibilityToggle() {
  const { settings, toggleAccessibility, isAccessibilityMode } = useAccessibility()
  const [isExpanded, setIsExpanded] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="fixed bottom-24 left-8 lg:bottom-8 lg:left-24 z-50 flex flex-col items-start gap-2">
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-2 rounded-xl bg-white shadow-2xl border border-gray-200 p-4 w-64 ml-0"
            role="dialog"
            aria-label="Accessibility settings"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-luxury-navy">
                  Accessibility Mode
                </h3>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-luxury-gold rounded p-1"
                  aria-label="Close accessibility settings"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-2 text-xs text-gray-600">
                <p className="leading-relaxed">
                  {isAccessibilityMode 
                    ? 'Enhanced accessibility features are active'
                    : 'Enable enhanced accessibility features for better readability and navigation'}
                </p>
                {isAccessibilityMode && (
                  <ul className="space-y-1 pl-4 list-disc text-[11px]">
                    <li>Reduced motion & animations</li>
                    <li>Enhanced focus indicators</li>
                    <li>Improved contrast</li>
                    <li>Readable typography</li>
                  </ul>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={toggleAccessibility}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        onFocus={() => setIsExpanded(true)}
        onBlur={() => setIsExpanded(false)}
        className={`
          group relative flex h-12 w-12 items-center justify-center rounded-full
          shadow-lg transition-all duration-300
          focus:outline-none focus:ring-4 focus:ring-luxury-gold/50 focus:ring-offset-2
          ${isAccessibilityMode 
            ? 'bg-luxury-gold text-luxury-navy hover:bg-luxury-gold/90' 
            : 'bg-luxury-navy text-white hover:bg-luxury-navy/90'
          }
        `}
        aria-label={isAccessibilityMode ? 'Disable Accessibility Mode' : 'Enable Accessibility Mode'}
        aria-pressed={isAccessibilityMode}
        title={isAccessibilityMode ? 'Disable Accessibility Mode' : 'Enable Accessibility Mode'}
      >
        <svg
          className="h-6 w-6 transition-transform duration-300 group-hover:scale-110"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>

        {isAccessibilityMode && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        )}

        <span className="sr-only">
          {isAccessibilityMode ? 'Accessibility mode is enabled' : 'Accessibility mode is disabled'}
        </span>
      </button>
    </div>
  )
}
