import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import { Suspense } from 'react'
import './globals.css'
import { Providers } from '@/components/providers'
import { AnnouncementBar } from '@/components/layout/announcement-bar'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ScrollToTop } from '@/components/scroll-to-top'
import { AssistantWidget } from '@/components/assistant-widget'
import { AccessibilityToggle } from '@/components/accessibility-toggle'

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
  metadataBase: new URL('https://mykonos.com'),
  title: {
    default: 'Mykonos - Luxury Fragrances & Perfumes',
    template: '%s | Mykonos',
  },
  description: 'Discover exquisite luxury fragrances and perfumes. Experience the art of fine perfumery with our exclusive collections of niche and haute perfumery.',
  keywords: ['luxury perfume', 'fragrance', 'haute perfumery', 'niche fragrance', 'luxury scents', 'designer perfume', 'exclusive fragrances', 'premium perfumes'],
  authors: [{ name: 'Mykonos' }],
  creator: 'Mykonos',
  publisher: 'Mykonos',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: '/assets/images/favicon.ico',
    apple: '/assets/images/favicon.ico',
    shortcut: '/assets/images/favicon.ico',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://mykonos.com',
    siteName: 'Mykonos',
    title: 'Mykonos - Luxury Fragrances & Perfumes',
    description: 'Discover exquisite luxury fragrances and perfumes. Experience the art of fine perfumery with our exclusive collections of niche and haute perfumery.',
  },
  twitter: {
    card: 'summary',
    title: 'Mykonos - Luxury Fragrances & Perfumes',
    description: 'Discover exquisite luxury fragrances and perfumes. Experience the art of fine perfumery with our exclusive collections.',
    creator: '@mykonos',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
  },
  alternates: {
    canonical: 'https://mykonos.com',
  },
  category: 'e-commerce',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: 'Mykonos',
    description: 'Luxury fragrances and perfumes boutique offering exclusive niche and haute perfumery collections',
    url: 'https://mykonos.com',
    priceRange: '$$$$',
    '@id': 'https://mykonos.com/#store',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://mykonos.com/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
    sameAs: [
      'https://www.instagram.com/mykonos',
      'https://www.facebook.com/mykonos',
      'https://twitter.com/mykonos',
    ],
  }

  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
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
            <AssistantWidget />
            <AccessibilityToggle />
          </div>
        </Providers>
      </body>
    </html>
  )
}
