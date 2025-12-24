'use client'

import { useState, useEffect } from 'react'

const messages = [
  'Discover our redeemable sampler sets. *T&Cs Apply.',
  'Free shipping on orders over $100',
  'Complimentary gift wrapping available',
  'New arrivals now in stock',
]

export function AnnouncementBar() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [key, setKey] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length)
      setKey((prev) => prev + 1)
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative overflow-hidden bg-black text-white shadow-lg">
      <div className="py-3">
        <div
          key={key}
          className="animate-scroll-message whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.2em] md:text-xs"
          style={{
            textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          }}
        >
          {messages[currentIndex]}
        </div>
      </div>
    </div>
  )
}
