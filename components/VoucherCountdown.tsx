'use client'

import { useState, useEffect } from 'react'

interface VoucherCountdownProps {
  validUntil: string
  className?: string
  onExpire?: () => void
  variant?: 'full' | 'badge' | 'card'
}

export function VoucherCountdown({ validUntil, className = '', onExpire, variant = 'full' }: VoucherCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const calculateTimeLeft = () => {
      const difference = new Date(validUntil).getTime() - Date.now()

      if (difference > 0) {
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
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
      if (!newTimeLeft && onExpire) onExpire()
    }

    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [validUntil, mounted, onExpire])

  if (!mounted || !timeLeft) return null

  const { days, hours, minutes, seconds } = timeLeft

  // Compact card badge: "Ends in 2d 3h" or "Ends in 3h 45m"
  if (variant === 'card') {
    let label = ''
    if (days > 0) {
      label = `${days}d ${hours}h`
    } else if (hours > 0) {
      label = `${hours}h ${minutes}m`
    } else {
      label = `${minutes}m`
    }
    return (
      <div className={`inline-flex items-center gap-1 ${className}`}>
        <svg className="h-2.5 w-2.5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
        <span className="text-[9px] md:text-[10px] font-semibold text-red-600">Ends in {label}</span>
      </div>
    )
  }

  // Badge mode: "Ends in Xh" inline span
  if (variant === 'badge') {
    if (days > 0) return <span className={className}>Ends in {days}d {hours}h</span>
    if (hours > 0) return <span className={className}>Ends in {hours}h {minutes}m</span>
    return <span className={className}>Ends in {minutes}m</span>
  }

  // Full countdown: HH:MM:SS boxes
  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {days > 0 && (
        <>
          <div className="bg-gray-900 text-white px-1.5 py-0.5 rounded text-xs font-bold min-w-[1.5rem] text-center">
            {String(days).padStart(2, '0')}
          </div>
          <span className="text-gray-700 font-bold text-xs px-0.5">d</span>
        </>
      )}
      <div className="bg-gray-900 text-white px-1.5 py-0.5 rounded text-xs font-bold min-w-[1.5rem] text-center">
        {String(hours).padStart(2, '0')}
      </div>
      <span className="text-gray-700 font-bold text-xs px-0.5">:</span>
      <div className="bg-gray-900 text-white px-1.5 py-0.5 rounded text-xs font-bold min-w-[1.5rem] text-center">
        {String(minutes).padStart(2, '0')}
      </div>
      <span className="text-gray-700 font-bold text-xs px-0.5">:</span>
      <div className="bg-gray-900 text-white px-1.5 py-0.5 rounded text-xs font-bold min-w-[1.5rem] text-center">
        {String(seconds).padStart(2, '0')}
      </div>
    </div>
  )
}
