'use client'

import { usePathname } from 'next/navigation'
import { Suspense } from 'react'
import { AnnouncementBar } from '@/components/layout/announcement-bar'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ScrollToTop } from '@/components/scroll-to-top'
import { WhatsAppButton } from '@/components/WhatsAppButton'
import NewsletterSubscription from '@/components/NewsletterSubscription'

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
      {pathname === '/' && <NewsletterSubscription />}
      <Footer />
      <ScrollToTop />
      <WhatsAppButton />
    </div>
  )
}
