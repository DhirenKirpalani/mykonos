'use client'

import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NotificationIconProps {
  count?: number
  onClick?: () => void
  isActive?: boolean
}

export function NotificationIcon({ count = 0, onClick, isActive = false }: NotificationIconProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex h-9 w-9 items-center justify-center rounded-lg transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-luxury-gold focus:ring-offset-2 focus:ring-offset-luxury-navy md:h-10 md:w-10",
        isActive
          ? "bg-white/10 text-luxury-gold"
          : "text-white hover:bg-white/10"
      )}
      aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ''}`}
    >
      <Bell className="h-4 w-4 md:h-5 md:w-5" aria-hidden="true" />
      
      {count > 0 && (
        <>
          <span
            className="
              absolute right-0 top-0
              flex h-4 w-4 items-center justify-center
              rounded-full
              bg-luxury-gold
              text-[9px]
              font-bold
              text-luxury-navy
              ring-2 ring-luxury-navy
            "
          >
            {count > 9 ? '9+' : count}
          </span>
          {/* Subtle pulse animation for unread notifications */}
          <span className="absolute right-0 top-0 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-luxury-gold opacity-30"></span>
          </span>
        </>
      )}
    </button>
  )
}
