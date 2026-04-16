'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export function AnnouncementBar() {
  const [messages, setMessages] = useState<string[]>([])
  const [index, setIndex] = useState(0)
  const textRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchMessages()
  }, [])

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('announcement_messages')
        .select('message')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (data && data.length > 0) {
        setMessages(data.map(m => m.message))
      } else {
        // Fallback messages if database is empty
        setMessages([
          'Discover our redeemable sampler sets. *T&Cs Apply.',
          'Free shipping on orders over $100',
          'Complimentary gift wrapping available',
        ])
      }
    } catch (error) {
      console.error('Error fetching announcement messages:', error)
      // Use fallback messages on error
      setMessages([
        'Discover our redeemable sampler sets. *T&Cs Apply.',
        'Free shipping on orders over $100',
      ])
    }
  }

  useEffect(() => {
    if (messages.length === 0) return
    
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
  }, [index, messages.length])

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
