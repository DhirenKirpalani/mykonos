'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Region, RegionDetectionResult } from '@/lib/types/region'
import { DEFAULT_REGION_CODE } from '@/lib/utils/region'

interface RegionContextType {
  region: Region | null
  detectionResult: RegionDetectionResult | null
  isLoading: boolean
  setRegion: (regionCode: string) => Promise<void>
  refreshRegion: () => Promise<void>
}

const RegionContext = createContext<RegionContextType | undefined>(undefined)

export function RegionProvider({ children }: { children: ReactNode }) {
  const [region, setRegionState] = useState<Region | null>(null)
  const [detectionResult, setDetectionResult] = useState<RegionDetectionResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const detectRegion = async () => {
    try {
      setIsLoading(true)
      
      // Check for manually selected region in localStorage
      const savedRegionCode = localStorage.getItem('selected_region')
      
      if (savedRegionCode) {
        // Fetch saved region details
        const response = await fetch(`/api/region/${savedRegionCode}`)
        if (response.ok) {
          const data = await response.json()
          setRegionState(data.region)
          setDetectionResult(data)
          return
        }
      }

      // Auto-detect region
      const response = await fetch('/api/region/detect')
      if (response.ok) {
        const data: RegionDetectionResult = await response.json()
        setRegionState(data.region)
        setDetectionResult(data)
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
  }

  const setRegion = async (regionCode: string) => {
    try {
      setIsLoading(true)
      
      const response = await fetch(`/api/region/${regionCode}`)
      if (response.ok) {
        const data: RegionDetectionResult = await response.json()
        setRegionState(data.region)
        setDetectionResult(data)
        
        // Save to localStorage
        localStorage.setItem('selected_region', regionCode)
      }
    } catch (error) {
      console.error('Set region error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshRegion = async () => {
    // Clear saved region and re-detect
    localStorage.removeItem('selected_region')
    await detectRegion()
  }

  useEffect(() => {
    detectRegion()
  }, [])

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
