'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Package, Tag, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export interface Notification {
  id: string
  title: string
  message: string
  type: 'order' | 'promotion' | 'general'
  read: boolean
  timestamp: Date
  link?: string
}

interface NotificationDialogProps {
  isOpen: boolean
  onClose: () => void
  notifications: Notification[]
  onMarkAsRead: (id: string) => void
  onMarkAllAsRead: () => void
}

export function NotificationDialog({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
}: NotificationDialogProps) {
  const { t } = useLanguage()
  const router = useRouter()
  const [displayCount, setDisplayCount] = useState(10)
  const unreadCount = notifications.filter(n => !n.read).length
  
  // Helper function to translate notification title and message
  const translateNotification = (notification: Notification) => {
    let title = notification.title
    let message = notification.message
    
    // Translate title
    if (title === 'Order Placed Successfully') {
      title = t.notifications.orderPlacedTitle
    } else if (title === 'Order Reminder') {
      title = t.notifications.orderReminderTitle
    }
    
    // Translate message and extract order number
    const orderNumberMatch = message.match(/#([A-Z0-9-]+)/)
    const orderNumber = orderNumberMatch ? orderNumberMatch[1] : ''
    
    if (message.includes('has been placed')) {
      message = t.notifications.orderPlacedMessage.replace('{orderNumber}', orderNumber)
    } else if (message.includes('is still pending')) {
      message = t.notifications.orderReminderMessage.replace('{orderNumber}', orderNumber)
    }
    
    return { title, message }
  }
  
  const displayedNotifications = notifications.slice(0, displayCount)
  const hasMore = notifications.length > displayCount
  
  const handleLoadMore = () => {
    setDisplayCount(prev => prev + 10)
  }
  
  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      onMarkAsRead(notification.id)
    }
    // Navigate to link if exists
    if (notification.link) {
      router.push(notification.link)
      onClose()
    }
  }

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'order':
        return <Package className="h-5 w-5" />
      case 'promotion':
        return <Tag className="h-5 w-5" />
      default:
        return <Bell className="h-5 w-5" />
    }
  }

  const getIconColor = (type: Notification['type']) => {
    switch (type) {
      case 'order':
        return 'bg-blue-500/10 text-blue-600'
      case 'promotion':
        return 'bg-luxury-gold/10 text-luxury-gold'
      default:
        return 'bg-luxury-navy/10 text-luxury-navy'
    }
  }

  const formatTimestamp = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return t.notifications.justNow
    if (minutes < 60) return t.notifications.minutesAgo.replace('{m}', String(minutes))
    if (hours < 24) return t.notifications.hoursAgo.replace('{h}', String(hours))
    if (days < 7) return t.notifications.daysAgo.replace('{d}', String(days))
    return date.toLocaleDateString()
  }

  // Group notifications by date label
  const getDateLabel = (date: Date): string => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / 86400000)
    if (days < 1) return 'Today'
    if (days < 2) return 'Yesterday'
    if (days < 7) return 'This Week'
    return 'Earlier'
  }

  const groupedNotifications = (() => {
    const groups: { label: string; items: Notification[] }[] = []
    const labelMap = new Map<string, number>()
    for (const n of displayedNotifications) {
      const label = getDateLabel(n.timestamp)
      const idx = labelMap.get(label)
      if (idx === undefined) {
        labelMap.set(label, groups.length)
        groups.push({ label, items: [n] })
      } else {
        groups[idx].items.push(n)
      }
    }
    return groups
  })()

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
          />

          {/* Mobile panel — anchored below the header */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed inset-x-3 top-16 z-50 rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 md:hidden"
            style={{ maxHeight: 'calc(100vh - 76px)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <div>
                <h2 className="text-lg font-montserrat font-bold text-luxury-navy">{t.notifications.title}</h2>
                {unreadCount > 0 && (
                  <p className="text-sm text-gray-500">{unreadCount} {t.notifications.unread}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={onMarkAllAsRead} className="rounded-lg px-3 py-1.5 text-sm font-medium text-luxury-gold transition-colors hover:bg-luxury-gold/10">
                    {t.notifications.markAllAsRead}
                  </button>
                )}
                <button onClick={onClose} className="rounded-lg p-2 transition-colors hover:bg-gray-100" aria-label={t.notifications.close}>
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 80px)' }}>
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 rounded-full bg-gray-100 p-4"><Bell className="h-8 w-8 text-gray-400" /></div>
                  <p className="text-sm font-medium text-gray-900">{t.notifications.noNotifications}</p>
                  <p className="mt-1 text-sm text-gray-500">{t.notifications.allCaughtUp}</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {groupedNotifications.map((group) => (
                    <div key={group.label}>
                      <div className="bg-gray-50/95 px-4 py-1.5 border-b border-gray-100">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{group.label}</span>
                      </div>
                      {group.items.map((notification) => (
                    <motion.div key={notification.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className={cn("group relative transition-all", !notification.read && "bg-luxury-gold/5")}>
                      <div onClick={() => handleNotificationClick(notification)} className="flex gap-3 px-4 py-3 cursor-pointer active:bg-gray-50">
                        <div className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full", getIconColor(notification.type))}>
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-0.5">
                            <h3 className={cn("text-sm font-montserrat font-semibold leading-tight", notification.read ? "text-gray-600" : "text-luxury-navy")}>
                              {translateNotification(notification).title}
                            </h3>
                            {!notification.read && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-luxury-gold mt-1" />}
                          </div>
                          <p className={cn("text-xs font-montserrat line-clamp-2 leading-relaxed mb-1.5", notification.read ? "text-gray-400" : "text-gray-600")}>
                            {translateNotification(notification).message}
                          </p>
                          <div className="flex items-center gap-3">
                            <p className="text-[11px] text-gray-400">{formatTimestamp(notification.timestamp)}</p>
                            {notification.link && <span className="text-[11px] text-luxury-gold font-medium">{t.notifications.viewDetails} →</span>}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                      ))}
                    </div>
                  ))}
                  {hasMore && (
                    <div className="p-4 text-center">
                      <button onClick={handleLoadMore} className="w-full rounded-lg py-2.5 px-4 text-sm font-medium text-luxury-navy hover:bg-luxury-gold/10 hover:text-luxury-gold">
                        {t.notifications.loadMore.replace('{count}', String(notifications.length - displayCount))}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* Desktop dropdown */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="hidden md:block fixed right-8 top-24 z-50 w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 p-4">
              <div>
                <h2 className="text-lg font-montserrat font-bold text-luxury-navy">
                  {t.notifications.title}
                </h2>
                {unreadCount > 0 && (
                  <p className="text-sm text-gray-500">
                    {unreadCount} {t.notifications.unread || 'unread'}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkAllAsRead}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-luxury-gold transition-colors hover:bg-luxury-gold/10"
                  >
                    {t.notifications.markAllAsRead}
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                  aria-label={t.notifications.close || 'Close'}
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 rounded-full bg-gray-100 p-4">
                    <Bell className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">{t.notifications.noNotifications}</p>
                  <p className="mt-1 text-sm text-gray-500">
                    {t.notifications.allCaughtUp}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {groupedNotifications.map((group) => (
                    <div key={group.label}>
                      {/* Date section header */}
                      <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm px-4 py-1.5 border-b border-gray-100">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{group.label}</span>
                      </div>
                      {group.items.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "group relative transition-all",
                        !notification.read && "bg-luxury-gold/5"
                      )}
                    >
                      <div
                        onClick={() => handleNotificationClick(notification)}
                        className="flex gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50/80 transition-colors"
                      >
                        {/* Icon */}
                        <div className={cn(
                          "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-transform group-hover:scale-110",
                          getIconColor(notification.type)
                        )}>
                          {getIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-0.5">
                            <h3 className={cn(
                              "text-sm font-montserrat font-semibold leading-tight",
                              notification.read ? "text-gray-600" : "text-luxury-navy"
                            )}>
                              {translateNotification(notification).title}
                            </h3>
                            {!notification.read && (
                              <span className="h-2 w-2 flex-shrink-0 rounded-full bg-luxury-gold mt-1" />
                            )}
                          </div>
                          <p className={cn(
                            "text-xs font-montserrat line-clamp-2 leading-relaxed mb-1.5",
                            notification.read ? "text-gray-400" : "text-gray-600"
                          )}>
                            {translateNotification(notification).message}
                          </p>
                          <div className="flex items-center gap-3">
                            <p className="text-[11px] text-gray-400 font-medium">
                              {formatTimestamp(notification.timestamp)}
                            </p>
                            {notification.link && (
                              <span className="text-[11px] text-luxury-gold group-hover:underline font-medium">
                                {t.notifications.viewDetails} →
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Mark as read button */}
                        {!notification.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onMarkAsRead(notification.id)
                            }}
                            className="flex-shrink-0 rounded-full p-1.5 opacity-0 transition-all hover:bg-luxury-gold/20 group-hover:opacity-100 hover:scale-110"
                            aria-label="Mark as read"
                            title="Mark as read"
                          >
                            <Check className="h-3.5 w-3.5 text-luxury-gold" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                      ))}
                    </div>
                  ))}
                  
                  {/* Load More Button */}
                  {hasMore && (
                    <div className="p-4 text-center border-t border-gray-100">
                      <button
                        onClick={handleLoadMore}
                        className="w-full rounded-lg py-2.5 px-4 text-sm font-medium text-luxury-navy transition-all hover:bg-luxury-gold/10 hover:text-luxury-gold"
                      >
                        {t.notifications.loadMore.replace('{count}', String(notifications.length - displayCount))}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
