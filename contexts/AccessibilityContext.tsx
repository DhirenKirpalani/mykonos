'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface AccessibilitySettings {
  enabled: boolean
  reducedMotion: boolean
  highContrast: boolean
  enhancedFocus: boolean
  readableTypography: boolean
  pauseAnimations: boolean
}

interface AccessibilityContextType {
  settings: AccessibilitySettings
  toggleAccessibility: () => void
  updateSetting: (key: keyof Omit<AccessibilitySettings, 'enabled'>, value: boolean) => void
  isAccessibilityMode: boolean
}

const defaultSettings: AccessibilitySettings = {
  enabled: false,
  reducedMotion: true,
  highContrast: true,
  enhancedFocus: true,
  readableTypography: true,
  pauseAnimations: true,
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined)

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    
    const savedSettings = localStorage.getItem('accessibility-settings')
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        setSettings(parsed)
        applyAccessibilityMode(parsed.enabled)
      } catch (error) {
        console.error('Failed to parse accessibility settings:', error)
      }
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mediaQuery.matches && !savedSettings) {
      const updatedSettings = { ...defaultSettings, enabled: true }
      setSettings(updatedSettings)
      applyAccessibilityMode(true)
      localStorage.setItem('accessibility-settings', JSON.stringify(updatedSettings))
    }
  }, [])

  const applyAccessibilityMode = useCallback((enabled: boolean) => {
    if (typeof document !== 'undefined') {
      if (enabled) {
        document.documentElement.setAttribute('data-accessibility', 'true')
        document.documentElement.classList.add('accessibility-mode')
      } else {
        document.documentElement.removeAttribute('data-accessibility')
        document.documentElement.classList.remove('accessibility-mode')
      }
    }
  }, [])

  const toggleAccessibility = useCallback(() => {
    setSettings(prev => {
      const newSettings = { ...prev, enabled: !prev.enabled }
      localStorage.setItem('accessibility-settings', JSON.stringify(newSettings))
      applyAccessibilityMode(newSettings.enabled)
      return newSettings
    })
  }, [applyAccessibilityMode])

  const updateSetting = useCallback((key: keyof Omit<AccessibilitySettings, 'enabled'>, value: boolean) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value }
      localStorage.setItem('accessibility-settings', JSON.stringify(newSettings))
      return newSettings
    })
  }, [])

  useEffect(() => {
    if (isClient) {
      applyAccessibilityMode(settings.enabled)
    }
  }, [settings.enabled, isClient, applyAccessibilityMode])

  const value = {
    settings,
    toggleAccessibility,
    updateSetting,
    isAccessibilityMode: settings.enabled,
  }

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  )
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext)
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider')
  }
  return context
}
