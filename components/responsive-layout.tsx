'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Database } from '@/lib/supabase/database.types'
import { LoadingSpinner } from '@/components/common'

const HomeDesktop = dynamic(() => import('@/components/home-desktop').then(mod => ({ default: mod.HomeDesktop })), {
  loading: () => <LoadingSpinner />,
  ssr: false
})

const HomeMobile = dynamic(() => import('@/components/home-mobile').then(mod => ({ default: mod.HomeMobile })), {
  loading: () => <LoadingSpinner />,
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
    return <LoadingSpinner />
  }

  return <LayoutComponent products={products} collections={collections} newArrivals={newArrivals} />
}
