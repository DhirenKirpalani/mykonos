'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { Region, RegionDetectionResult } from '@/lib/types/region'
import { DEFAULT_REGION_CODE } from '@/lib/utils/region'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from './AuthContext'

interface RegionContextType {
  region: Region | null
  detectionResult: RegionDetectionResult | null
  isLoading: boolean
  setRegion: (regionCode: string) => Promise<void>
  refreshRegion: () => Promise<void>
}

const RegionContext = createContext<RegionContextType | undefined>(undefined)

// Generate or retrieve visitor session ID
function getVisitorSessionId(): string {
  const storageKey = 'visitor_session_id'
  let sessionId = localStorage.getItem(storageKey)
  
  if (!sessionId) {
    // Generate UUID v4
    sessionId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
    localStorage.setItem(storageKey, sessionId)
  }
  
  return sessionId
}

export function RegionProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth()
  const [region, setRegionState] = useState<Region | null>(null)
  const [detectionResult, setDetectionResult] = useState<RegionDetectionResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const detectRegion = useCallback(async () => {
    try {
      setIsLoading(true)
      
      // First check localStorage for cached region (for immediate load)
      const cachedRegionCode = localStorage.getItem('selected_region_code')
      if (cachedRegionCode) {
        try {
          const response = await fetch(`/api/region/${cachedRegionCode}`)
          if (response.ok) {
            const data: RegionDetectionResult = await response.json()
            setRegionState(data.region)
            setDetectionResult(data)
            setIsLoading(false)
            return // Return early to prevent auto-detection from overriding saved preference
          }
        } catch (error) {
          console.error('Failed to load cached region:', error)
          // If cached region fails to load, continue to auto-detection
        }
      }
      
      // Check if visitor has saved preference
      if (!user) {
        const sessionId = getVisitorSessionId()
        const response = await fetch(`/api/visitor/preferences?session_id=${sessionId}`)
        
        if (response.ok) {
          const data = await response.json()
          if (data.preference && data.region) {
            setRegionState(data.region)
            setDetectionResult({
              country_code: data.preference.detected_country_code,
              region: data.region,
              country_region: null as any,
              shipping_zone: null as any,
              source: 'default',
            })
            localStorage.setItem('selected_region_code', data.region.code)
            setIsLoading(false)
            return
          }
        }
      }

      // Auto-detect region
      const response = await fetch('/api/region/detect')
      if (response.ok) {
        const data: RegionDetectionResult = await response.json()
        setRegionState(data.region)
        setDetectionResult(data)
        localStorage.setItem('selected_region_code', data.region.code)
        
        // Save detected region to database for visitors
        if (!user && data.region) {
          const sessionId = getVisitorSessionId()
          await fetch('/api/visitor/preferences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: sessionId,
              region_id: data.region.id,
              ip_address: null,
              browser_locale: navigator.language,
              detected_country_code: data.country_code,
            }),
          })
        }
      } else {
        throw new Error('Failed to detect region')
      }
    } catch (error) {
      console.error('Region detection error:', error)
      
      // Fallback to default region
      try {
        const response = await fetch(`/api/region/${DEFAULT_REGION_CODE}`)
        if (response.ok) {
          const data = await response.json()
          setRegionState(data.region)
          setDetectionResult(data)
        }
      } catch (fallbackError) {
        console.error('Fallback region error:', fallbackError)
      }
    } finally {
      setIsLoading(false)
    }
  }, [user])

  const setRegion = async (regionCode: string) => {
    try {
      setIsLoading(true)
      
      const response = await fetch(`/api/region/${regionCode}`)
      if (response.ok) {
        const data: RegionDetectionResult = await response.json()
        setRegionState(data.region)
        setDetectionResult(data)
        
        // Store in localStorage for persistence across page refreshes
        localStorage.setItem('selected_region_code', data.region.code)
        
        if (user) {
          // Save to user profile
          await supabase.rpc('set_preferred_region', {
            p_user_id: user.id,
            p_region_id: data.region.id,
          } as any)
        } else {
          // Save to visitor preferences
          const sessionId = getVisitorSessionId()
          await fetch('/api/visitor/preferences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: sessionId,
              region_id: data.region.id,
              ip_address: null,
              browser_locale: navigator.language,
              detected_country_code: detectionResult?.country_code || null,
            }),
          })
        }
      }
    } catch (error) {
      console.error('Set region error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshRegion = useCallback(async () => {
    // Clear saved preferences and re-detect
    if (!user) {
      // Clear visitor session to force re-detection
      localStorage.removeItem('visitor_session_id')
    }
    
    await detectRegion()
  }, [user, detectRegion])

  useEffect(() => {
    // Wait for auth to finish loading before detecting region
    if (!authLoading) {
      detectRegion()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user])

  return (
    <RegionContext.Provider
      value={{
        region,
        detectionResult,
        isLoading,
        setRegion,
        refreshRegion,
      }}
    >
      {children}
    </RegionContext.Provider>
  )
}

export function useRegion() {
  const context = useContext(RegionContext)
  if (context === undefined) {
    throw new Error('useRegion must be used within a RegionProvider')
  }
  return context
}
