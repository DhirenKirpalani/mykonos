'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Search, ShoppingBag, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { NotificationIcon } from '@/components/notification-icon'
import { NotificationDialog, type Notification } from '@/components/notification-dialog'
import { useLanguage } from '@/contexts/LanguageContext'

export function HeaderDesktop() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { t } = useLanguage()

  // Sample notifications - replace with actual data from your backend
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'Order Shipped',
      message: 'Your order #12345 has been shipped and is on its way!',
      type: 'order',
      read: false,
      timestamp: new Date(Date.now() - 3600000), // 1 hour ago
    },
    {
      id: '2',
      title: 'New Arrivals',
      message: 'Check out our latest collection of Mediterranean fragrances.',
      type: 'promotion',
      read: false,
      timestamp: new Date(Date.now() - 7200000), // 2 hours ago
    },
    {
      id: '3',
      title: 'Welcome to Mykonos',
      message: 'Thank you for joining us! Enjoy 10% off your first order.',
      type: 'general',
      read: true,
      timestamp: new Date(Date.now() - 86400000), // 1 day ago
    },
  ])

  const unreadCount = notifications.filter(n => !n.read).length

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const navigation = [
    { name: t.nav.home, href: '/' },
    { name: t.nav.catalog, href: '/products' },
    { name: t.nav.contact, href: '/contact' },
    { name: t.nav.sale, href: '/products?sale=true' },
  ]

  useEffect(() => {
    setSearchOpen(false)
  }, [pathname])

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    
    if (href.includes('?')) {
      const [path, query] = href.split('?')
      if (pathname !== path) return false
      
      const params = new URLSearchParams(query)
      const paramsArray = Array.from(params.entries())
      for (const [key, value] of paramsArray) {
        if (searchParams.get(key) !== value) return false
      }
      return true
    }
    
    return pathname.startsWith(href) && !searchParams.toString()
  }

  return (
    <header className="sticky top-10 z-50 w-full bg-luxury-navy text-white shadow-lg hidden lg:block">
      <nav className="container mx-auto px-8">
        <div className="flex h-18 items-center justify-center">
          <div className="flex-1"></div>
          
          <Link href="/" className="static translate-x-0">
            <span className="font-serif text-4xl font-medium tracking-[0.25em] text-luxury-gold transition-all duration-300 hover:opacity-90">
              MYKONOS
            </span>
          </Link>

          <div className="flex items-center gap-4 flex-1 justify-end">
            <LanguageSwitcher />
            <button 
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-luxury-gold focus:ring-offset-2 focus:ring-offset-luxury-navy",
                searchOpen 
                  ? "bg-white/10 text-luxury-gold" 
                  : "text-white hover:bg-white/10"
              )}
              onClick={() => setSearchOpen(!searchOpen)}
              aria-label={searchOpen ? "Close search" : "Open search"}
              aria-expanded={searchOpen}
              aria-controls="desktop-search"
            >
              <Search className="h-5 w-5" aria-hidden="true" />
            </button>
            <NotificationIcon 
              count={unreadCount} 
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              isActive={notificationsOpen}
            />
            <Link 
              href="/cart"
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-luxury-gold focus:ring-offset-2 focus:ring-offset-luxury-navy",
                pathname === '/cart'
                  ? "bg-white/10 text-luxury-gold"
                  : "text-white hover:bg-white/10"
              )}
              aria-label="Shopping cart"
            >
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            </Link>
            <Link 
              href="/account"
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-luxury-gold focus:ring-offset-2 focus:ring-offset-luxury-navy",
                pathname.startsWith('/account')
                  ? "bg-white/10 text-luxury-gold"
                  : "text-white hover:bg-white/10"
              )}
              aria-label="Account"
            >
              <User className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="border-t border-white/10">
          <nav 
            className="flex items-center justify-center gap-10 py-5"
            role="navigation"
            aria-label="Main navigation"
          >
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "text-sm font-medium uppercase tracking-wider transition-all hover:text-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold focus:ring-offset-2 focus:ring-offset-luxury-navy rounded px-2 py-1",
                  isActive(item.href)
                    ? "text-luxury-gold border-b-2 border-luxury-gold pb-1"
                    : "text-white"
                )}
                aria-current={isActive(item.href) ? 'page' : undefined}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </nav>

      {searchOpen && (
        <div 
          id="desktop-search"
          className="animate-fade-in border-t border-white/10 bg-luxury-navy-light px-4 py-6"
          role="search"
          aria-label="Search products"
        >
          <div className="container mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <input
                type="search"
                placeholder="Search for fragrances..."
                aria-label="Search for fragrances"
                className="w-full rounded-lg border border-luxury-gold/30 bg-luxury-navy-dark py-4 pl-12 pr-4 text-sm text-white placeholder:text-gray-400 transition-all focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/50"
                autoFocus
              />
            </div>
          </div>
        </div>
      )}

      <NotificationDialog
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
      />
    </header>
  )
}
