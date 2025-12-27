'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Package, Tag, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Notification {
  id: string
  title: string
  message: string
  type: 'order' | 'promotion' | 'general'
  read: boolean
  timestamp: Date
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
  const unreadCount = notifications.filter(n => !n.read).length

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

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

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

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed right-4 top-20 z-50 w-[calc(100vw-2rem)] max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 md:right-8 md:top-24"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 p-4">
              <div>
                <h2 className="text-lg font-semibold text-luxury-navy">
                  Notifications
                </h2>
                {unreadCount > 0 && (
                  <p className="text-sm text-gray-500">
                    {unreadCount} unread
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkAllAsRead}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-luxury-gold transition-colors hover:bg-luxury-gold/10"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                  aria-label="Close notifications"
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
                  <p className="text-sm font-medium text-gray-900">No notifications</p>
                  <p className="mt-1 text-sm text-gray-500">
                    You're all caught up!
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "group relative p-4 transition-colors hover:bg-gray-50",
                        !notification.read && "bg-luxury-gold/5"
                      )}
                    >
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div className={cn(
                          "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
                          getIconColor(notification.type)
                        )}>
                          {getIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className={cn(
                              "text-sm font-medium",
                              notification.read ? "text-gray-700" : "text-luxury-navy"
                            )}>
                              {notification.title}
                            </h3>
                            {!notification.read && (
                              <span className="h-2 w-2 flex-shrink-0 rounded-full bg-luxury-gold" />
                            )}
                          </div>
                          <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="mt-1 text-xs text-gray-400">
                            {formatTimestamp(notification.timestamp)}
                          </p>
                        </div>

                        {/* Mark as read button */}
                        {!notification.read && (
                          <button
                            onClick={() => onMarkAsRead(notification.id)}
                            className="absolute right-4 top-4 rounded-full p-1 opacity-0 transition-all hover:bg-luxury-gold/10 group-hover:opacity-100"
                            aria-label="Mark as read"
                          >
                            <Check className="h-4 w-4 text-luxury-gold" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t border-gray-100 p-3">
                <button
                  onClick={onClose}
                  className="w-full rounded-lg py-2 text-sm font-medium text-luxury-navy transition-colors hover:bg-gray-50"
                >
                  View all notifications
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
