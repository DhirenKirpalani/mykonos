'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Database } from '@/lib/supabase/database.types'

const HomeDesktop = dynamic(() => import('@/components/home-desktop').then(mod => ({ default: mod.HomeDesktop })), {
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-luxury-navy via-luxury-navy-light to-luxury-navy overflow-hidden">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <h2 className="font-serif text-4xl font-medium tracking-[0.3em] text-luxury-gold md:text-5xl animate-pulse-subtle">
            MYKONOS
          </h2>
          <div className="absolute -inset-4 bg-luxury-gold/5 blur-2xl rounded-full"></div>
        </div>
        <div className="relative h-14 w-14 md:h-16 md:w-16">
          <div className="absolute inset-0 rounded-full border-[3px] border-luxury-gold/20"></div>
          <div className="absolute inset-0 animate-spin-smooth rounded-full border-[3px] border-transparent border-t-luxury-gold border-r-luxury-gold/60"></div>
          <div className="absolute inset-2 rounded-full bg-luxury-gold/5 animate-pulse-glow"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-luxury-gold animate-pulse-subtle"></div>
          </div>
        </div>
        <span className="sr-only">Loading content, please wait</span>
      </div>
    </div>
  ),
  ssr: false
})

const HomeMobile = dynamic(() => import('@/components/home-mobile').then(mod => ({ default: mod.HomeMobile })), {
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-luxury-navy via-luxury-navy-light to-luxury-navy overflow-hidden">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <h2 className="font-serif text-4xl font-medium tracking-[0.3em] text-luxury-gold md:text-5xl animate-pulse-subtle">
            MYKONOS
          </h2>
          <div className="absolute -inset-4 bg-luxury-gold/5 blur-2xl rounded-full"></div>
        </div>
        <div className="relative h-14 w-14 md:h-16 md:w-16">
          <div className="absolute inset-0 rounded-full border-[3px] border-luxury-gold/20"></div>
          <div className="absolute inset-0 animate-spin-smooth rounded-full border-[3px] border-transparent border-t-luxury-gold border-r-luxury-gold/60"></div>
          <div className="absolute inset-2 rounded-full bg-luxury-gold/5 animate-pulse-glow"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-luxury-gold animate-pulse-subtle"></div>
          </div>
        </div>
        <span className="sr-only">Loading content, please wait</span>
      </div>
    </div>
  ),
  ssr: false
})

type Product = Database['public']['Tables']['products']['Row']
type Collection = Database['public']['Tables']['collections']['Row']

interface ResponsiveLayoutProps {
  products: Product[]
  collections: Collection[]
  newArrivals: Product[]
}

export function ResponsiveLayout({ products, collections, newArrivals }: ResponsiveLayoutProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [isClient, setIsClient] = useState(false)

  const checkViewport = useCallback(() => {
    setIsMobile(window.innerWidth < 1024)
  }, [])

  useEffect(() => {
    setIsClient(true)
    checkViewport()

    let timeoutId: NodeJS.Timeout
    const debouncedResize = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(checkViewport, 150)
    }

    window.addEventListener('resize', debouncedResize, { passive: true })

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', debouncedResize)
    }
  }, [checkViewport])

  const LayoutComponent = useMemo(() => isMobile ? HomeMobile : HomeDesktop, [isMobile])

  if (!isClient) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-luxury-navy via-luxury-navy-light to-luxury-navy overflow-hidden">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <h2 className="font-serif text-4xl font-medium tracking-[0.3em] text-luxury-gold md:text-5xl animate-pulse-subtle">
              MYKONOS
            </h2>
            <div className="absolute -inset-4 bg-luxury-gold/5 blur-2xl rounded-full"></div>
          </div>
          <div className="relative h-14 w-14 md:h-16 md:w-16">
            <div className="absolute inset-0 rounded-full border-[3px] border-luxury-gold/20"></div>
            <div className="absolute inset-0 animate-spin-smooth rounded-full border-[3px] border-transparent border-t-luxury-gold border-r-luxury-gold/60"></div>
            <div className="absolute inset-2 rounded-full bg-luxury-gold/5 animate-pulse-glow"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-luxury-gold animate-pulse-subtle"></div>
            </div>
          </div>
          <span className="sr-only">Loading content, please wait</span>
        </div>
      </div>
    )
  }

  return <LayoutComponent products={products} collections={collections} newArrivals={newArrivals} />
}
