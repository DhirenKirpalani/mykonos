import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import { Suspense } from 'react'
import './globals.css'
import { Providers } from '@/components/providers'
import { ConditionalLayout } from '@/components/conditional-layout'

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

const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL || 'https://mykonos-test.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Mykonos - Modern & Vibrant Perfumery',
    template: '%s | Mykonos',
  },
  description: 'Discover exquisite luxury fragrances and perfumes. Experience the art of fine perfumery with our exclusive collections of niche and haute perfumery.',
  keywords: ['luxury perfume', 'fragrance', 'haute perfumery', 'niche fragrance', 'luxury scents', 'designer perfume', 'exclusive fragrances', 'premium perfumes'],
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
  authors: [{ name: 'Mykonos' }],
  creator: 'Mykonos',
  publisher: 'Mykonos',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/assets/images/mykonos-logo.png', type: 'image/png' },
      { url: '/assets/images/favicon.ico', sizes: 'any' },
    ],
    apple: '/assets/images/mykonos-logo.png',
    shortcut: '/assets/images/mykonos-logo.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: baseUrl,
    siteName: 'Mykonos',
    title: 'Mykonos - Modern & Vibrant Perfumery',
    description: 'Discover exquisite luxury fragrances and perfumes. Experience the art of fine perfumery with our exclusive collections of niche and haute perfumery.',
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
    canonical: baseUrl,
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
    '@type': 'OnlineStore',
    name: 'Mykonos',
    description: 'Luxury fragrances and perfumes boutique offering exclusive niche and haute perfumery collections',
    url: baseUrl,
    priceRange: '$$$$',
    '@id': `${baseUrl}/#store`,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    sameAs: [
      'https://www.instagram.com/officialmykonos/',
      'https://www.tiktok.com/@mykonosofficial',
    ],
  }

  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} bg-luxury-navy`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="font-sans antialiased bg-luxury-navy">
        <Providers>
          <ConditionalLayout>{children}</ConditionalLayout>
        </Providers>
      </body>
    </html>
  )
}
