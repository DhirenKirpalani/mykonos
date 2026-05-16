import { Metadata } from 'next'
import { HomePageClient } from '@/components/home-page-client'

export const metadata: Metadata = {
  title: 'Mykonos - Modern & Vibrant Perfumery',
  description: 'Discover luxury fragrances at Mykonos. Shop our collection of modern and vibrant perfumes for men and women.',
  openGraph: {
    title: 'Mykonos - Modern & Vibrant Perfumery',
    description: 'Discover luxury fragrances at Mykonos. Shop our collection of modern and vibrant perfumes for men and women.',
    type: 'website',
  },
}

export default function HomePage() {
  return <HomePageClient />
}
