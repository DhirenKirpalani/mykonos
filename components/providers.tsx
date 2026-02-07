'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { AccessibilityProvider } from '@/contexts/AccessibilityContext'
import { RegionProvider } from '@/contexts/RegionContext'
import { Toaster } from 'sonner'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AccessibilityProvider>
        <RegionProvider>
          <LanguageProvider>
            <Toaster 
              position="top-center" 
              richColors 
              closeButton
              toastOptions={{
                style: {
                  fontFamily: 'var(--font-inter)',
                },
              }}
            />
            {children}
          </LanguageProvider>
        </RegionProvider>
      </AccessibilityProvider>
    </QueryClientProvider>
  )
}
