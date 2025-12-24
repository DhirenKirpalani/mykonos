import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import { Suspense } from 'react'
import './globals.css'
import { Providers } from '@/components/providers'
import { AnnouncementBar } from '@/components/layout/announcement-bar'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ScrollToTop } from '@/components/scroll-to-top'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const playfair = Playfair_Display({ 
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Mykonos - Luxury Fragrances & Perfumes',
  description: 'Discover exquisite luxury fragrances and perfumes. Experience the art of fine perfumery with our exclusive collections.',
  keywords: 'luxury perfume, fragrance, haute perfumery, niche fragrance, luxury scents',
  icons: {
    icon: '/assets/images/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans antialiased">
        <Providers>
          <div className="flex min-h-screen flex-col">
            <AnnouncementBar />
            <Suspense fallback={<div className="h-16 bg-luxury-navy" />}>
              <Header />
            </Suspense>
            <main className="flex-1">{children}</main>
            <Footer />
            <ScrollToTop />
          </div>
        </Providers>
      </body>
    </html>
  )
}
