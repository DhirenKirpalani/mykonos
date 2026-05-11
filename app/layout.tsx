import type { Metadata } from 'next'
import { Lato, Libre_Caslon_Text, Montserrat } from 'next/font/google'
import { Suspense } from 'react'
import Script from 'next/script'
import './globals.css'
import { Providers } from '@/components/providers'
import { ConditionalLayout } from '@/components/conditional-layout'

const lato = Lato({
  subsets: ['latin'],
  variable: '--font-lato',
  weight: ['400', '700'],
  display: 'swap',
})

const caslon = Libre_Caslon_Text({
  subsets: ['latin'],
  variable: '--font-caslon',
  weight: ['400', '700'],
  display: 'swap',
})

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  weight: ['400'],
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
    <html lang="en" className={`${lato.variable} ${caslon.variable} ${montserrat.variable} bg-luxury-navy`}>
      <head>
        {/* Sets html lang BEFORE hydration so Chrome's translate bubble fires */}
        <script dangerouslySetInnerHTML={{ __html: `try{var l=localStorage.getItem('page_lang');if(l&&l!=='en')document.documentElement.lang=l;}catch(e){}` }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {/* Google Translate initializer — creates mount div dynamically to avoid hydration mismatch */}
        <script dangerouslySetInnerHTML={{ __html: `window.googleTranslateElementInit=function(){var e=document.getElementById('google_translate_element');if(!e){e=document.createElement('div');e.id='google_translate_element';e.style.display='none';document.body.appendChild(e);}new google.translate.TranslateElement({pageLanguage:'en',includedLanguages:'ar,de,fr,it,es,nl,pl,ro,cs,hu,sk,id,hi,ms,ur',autoDisplay:false},'google_translate_element');}` }} />
      </head>
      <body className="font-sans antialiased bg-luxury-navy" suppressHydrationWarning>
        <Providers>
          <ConditionalLayout>{children}</ConditionalLayout>
        </Providers>
        <Script
          src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}
