'use client'

import { useState, useEffect } from 'react'

interface VoucherCountdownProps {
  validUntil: string
  className?: string
  onExpire?: () => void
}

export function VoucherCountdown({ validUntil, className = '', onExpire }: VoucherCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const calculateTimeLeft = () => {
      // Convert DB UTC time to Jakarta time for comparison
      const endDate = new Date(new Date(validUntil).toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
      const nowJakarta = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
      const difference = endDate.getTime() - nowJakarta.getTime()

      if (difference > 0) {
        return {
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        }
      }
      return null
    }

    const updateTime = () => {
      const newTimeLeft = calculateTimeLeft()
      setTimeLeft(newTimeLeft)
      
      // Call onExpire callback when countdown reaches zero
      if (!newTimeLeft && onExpire) {
        onExpire()
      }
    }

    updateTime()

    const timer = setInterval(updateTime, 1000)

    return () => clearInterval(timer)
  }, [validUntil, mounted, onExpire])

  if (!mounted || !timeLeft) return null

  const hours = timeLeft.hours
  const minutes = timeLeft.minutes
  const isCompact = className?.includes('text-orange')
  
  if (isCompact) {
    // Compact format for product details badge
    if (hours > 0) {
      return (
        <span className={className}>
          Sisa {hours} jam
        </span>
      )
    } else if (minutes === 30) {
      return (
        <span className={className}>
          Sisa 30 menit
        </span>
      )
    } else if (minutes < 30) {
      return (
        <span className={className}>
          Kurang dari 30 menit
        </span>
      )
    } else {
      return (
        <span className={className}>
          Sisa {minutes} menit
        </span>
      )
    }
  }

  // Full countdown format for product details voucher section
  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      <div className="bg-gray-900 text-white px-1.5 py-0.5 rounded text-xs font-bold min-w-[1.5rem] text-center">
        {String(timeLeft.hours).padStart(2, '0')}
      </div>
      <span className="text-gray-700 font-bold text-xs px-0.5">:</span>
      <div className="bg-gray-900 text-white px-1.5 py-0.5 rounded text-xs font-bold min-w-[1.5rem] text-center">
        {String(timeLeft.minutes).padStart(2, '0')}
      </div>
      <span className="text-gray-700 font-bold text-xs px-0.5">:</span>
      <div className="bg-gray-900 text-white px-1.5 py-0.5 rounded text-xs font-bold min-w-[1.5rem] text-center">
        {String(timeLeft.seconds).padStart(2, '0')}
      </div>
    </div>
  )
}
