'use client'

import { usePathname } from 'next/navigation'
import { Suspense } from 'react'
import { AnnouncementBar } from '@/components/layout/announcement-bar'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ScrollToTop } from '@/components/scroll-to-top'
import { AssistantWidget } from '@/components/assistant-widget'
import { AccessibilityToggle } from '@/components/accessibility-toggle'

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isCMSRoute = pathname.startsWith('/cms')

  if (isCMSRoute) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <Suspense fallback={<div className="h-16 bg-luxury-navy" />}>
        <Header />
      </Suspense>
      <main className="flex-1">{children}</main>
      <Footer />
      <ScrollToTop />
      <AssistantWidget />
      <AccessibilityToggle />
    </div>
  )
}
