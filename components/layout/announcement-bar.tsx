'use client'

import { useEffect, useRef, useState } from 'react'

const messages = [
  'Discover our redeemable sampler sets. *T&Cs Apply.',
  'Free shipping on orders over $100',
  'Complimentary gift wrapping available',
  'New arrivals now in stock',
]

export function AnnouncementBar() {
  const [index, setIndex] = useState(0)
  const textRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const textEl = textRef.current
    if (!textEl) return

    const container = textEl.parentElement!
    const bannerWidth = container.offsetWidth
    const textWidth = textEl.offsetWidth

    // Center position
    const centerX = (bannerWidth - textWidth) / 2

    // Reset: start off-screen right
    textEl.style.transform = `translateX(${bannerWidth}px)`

    // 1️⃣ Right → Center
    const enter = textEl.animate(
      [
        { transform: `translateX(${bannerWidth}px)` },
        { transform: `translateX(${centerX}px)` },
      ],
      {
        duration: 6000,
        easing: 'linear',
        fill: 'forwards',
      }
    )

    enter.onfinish = () => {
      // 2️⃣ Pause at center
      setTimeout(() => {
        // 3️⃣ Center → Left (exit)
        const exit = textEl.animate(
          [
            { transform: `translateX(${centerX}px)` },
            { transform: `translateX(-${textWidth}px)` },
          ],
          {
            duration: 6000,
            easing: 'linear',
            fill: 'forwards',
          }
        )

        exit.onfinish = () => {
          // 4️⃣ Next message
          setIndex((prev) => (prev + 1) % messages.length)
        }
      }, 2000)
    }
  }, [index])

  return (
    <div className="sticky top-0 z-[60] relative overflow-hidden bg-black text-white">
      <div className="h-10 flex items-center">
        <div
          ref={textRef}
          className="absolute whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.2em] md:text-xs"
          style={{
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            textShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          {messages[index]}
        </div>
      </div>
    </div>
  )
}
