'use client'

import { usePathname } from 'next/navigation'
import { Suspense, useState, useEffect } from 'react'
import { AnnouncementBar } from '@/components/layout/announcement-bar'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ScrollToTop } from '@/components/scroll-to-top'
import { LiveChatWidget } from '@/components/LiveChatWidget'
import NewsletterSubscription from '@/components/NewsletterSubscription'

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isCMSRoute = pathname.startsWith('/cms')
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (isCMSRoute) {
    return <>{children}</>
  }

  // Don't render header/footer until client-side mounted to prevent flash
  if (!isMounted) {
    return <div className="min-h-screen bg-luxury-navy">{children}</div>
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <Suspense fallback={<div className="h-16 bg-luxury-navy" />}>
        <Header />
      </Suspense>
      <main className="flex-1">{children}</main>
      {pathname === '/' && <NewsletterSubscription />}
      <Footer />
      <ScrollToTop />
      <LiveChatWidget />
    </div>
  )
}
