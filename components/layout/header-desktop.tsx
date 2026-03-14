'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Search, ShoppingBag, User, Settings, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { RegionCurrencySelector } from '@/components/RegionCurrencySelector'
import { NotificationIcon } from '@/components/notification-icon'
import { NotificationDialog, type Notification } from '@/components/notification-dialog'
import { SearchModal } from '@/components/search-modal'
import { CartModal } from '@/components/cart-modal'
import { WishlistModal } from '@/components/wishlist-modal'
import { useLanguage } from '@/contexts/LanguageContext'
import { useUserRole } from '@/hooks/useUserRole'
import { useCartCount } from '@/hooks/useCartCount'
import { useWishlistCount } from '@/hooks/useWishlistCount'

export function HeaderDesktop() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [wishlistOpen, setWishlistOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { t } = useLanguage()
  const { role } = useUserRole()
  const { count: cartCount } = useCartCount()
  const { count: wishlistCount } = useWishlistCount()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Sample notifications - replace with actual data from your backend
  const [notifications, setNotifications] = useState<Notification[]>([])

  const unreadCount = notifications.filter(n => !n.read).length

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const navItems = [
    { name: t.nav.home, href: '/' },
    { name: t.nav.catalog, href: '/products' },
    { name: t.nav.contact, href: '/contact' },
    { name: t.header.trackOrder, href: '/track-order' },
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
    
    // Special case for /products - should be active when on products page regardless of filters
    if (href === '/products') {
      return pathname === '/products'
    }
    
    return pathname.startsWith(href) && !searchParams.toString()
  }

  // Prevent hydration mismatch - render minimal header until mounted
  if (!mounted) {
    return (
      <header className="sticky top-10 z-50 w-full bg-luxury-navy text-white shadow-lg hidden lg:block">
        <nav className="container mx-auto px-8">
          <div className="flex h-20 items-center justify-center">
            <div className="flex items-center gap-5 flex-1" />
            <Link href="/" className="static translate-x-0">
              <span className="font-serif text-4xl font-medium tracking-[0.25em] text-luxury-gold transition-all duration-300 hover:opacity-90">
                MYKONOS
              </span>
            </Link>
            <div className="flex items-center gap-5 flex-1 justify-end" />
          </div>
        </nav>
      </header>
    )
  }

  return (
    <header className="sticky top-10 z-50 w-full bg-luxury-navy text-white shadow-lg hidden lg:block">
      <nav className="container mx-auto px-8">
        <div className="flex h-20 items-center justify-center">
          <div className="flex items-center gap-5 flex-1">
            <RegionCurrencySelector />
          </div>
          
          <Link href="/" className="static translate-x-0">
            <span className="font-serif text-4xl font-medium tracking-[0.25em] text-luxury-gold transition-all duration-300 hover:opacity-90">
              MYKONOS
            </span>
          </Link>

          <div className="flex items-center gap-5 flex-1 justify-end">
            {role !== 'customer' && (
              <Link
                href="/cms"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg transition-all active:scale-95",
                  pathname.startsWith('/cms')
                    ? "bg-white/10 text-luxury-gold"
                    : "text-white hover:bg-white/10"
                )}
                aria-label="Admin Panel"
              >
                <Settings className="h-5 w-5" aria-hidden="true" />
              </Link>
            )}
            <button 
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg transition-all active:scale-95",
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
            <button
              onClick={() => setWishlistOpen(true)}
              className={cn(
                "relative flex h-10 w-10 items-center justify-center rounded-lg transition-all active:scale-95",
                wishlistOpen
                  ? "bg-white/10 text-luxury-gold"
                  : "text-white hover:bg-white/10"
              )}
              aria-label={`Wishlist${wishlistCount > 0 ? ` (${wishlistCount} items)` : ''}`}
            >
              <Heart className="h-5 w-5" aria-hidden="true" />
              {wishlistCount > 0 && (
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
                  {wishlistCount > 9 ? '9+' : wishlistCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setCartOpen(true)}
              className={cn(
                "relative flex h-10 w-10 items-center justify-center rounded-lg transition-all active:scale-95",
                cartOpen
                  ? "bg-white/10 text-luxury-gold"
                  : "text-white hover:bg-white/10"
              )}
              aria-label={`Shopping cart${cartCount > 0 ? ` (${cartCount} items)` : ''}`}
            >
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
              {cartCount > 0 && (
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
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>
            <Link 
              href="/account"
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg transition-all active:scale-95",
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

        <div>
          <nav 
            className="flex items-center justify-center gap-10 py-5"
            role="navigation"
            aria-label="Main navigation"
          >
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "text-sm font-medium uppercase tracking-wider transition-all hover:text-luxury-gold rounded px-2 py-1",
                  isActive(item.href)
                    ? "text-luxury-gold"
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

      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <CartModal isOpen={cartOpen} onClose={() => setCartOpen(false)} />
      <WishlistModal isOpen={wishlistOpen} onClose={() => setWishlistOpen(false)} />

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
