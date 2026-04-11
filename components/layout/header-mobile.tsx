'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Search, ShoppingBag, User, Menu, X, Settings, Heart, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { RegionCurrencySelector } from '@/components/RegionCurrencySelector'
import { NotificationIcon } from '@/components/notification-icon'
import { NotificationDialog, type Notification } from '@/components/notification-dialog'
import { WishlistModal } from '@/components/wishlist-modal'
import { CartModal } from '@/components/cart-modal'
import { useLanguage } from '@/contexts/LanguageContext'
import { useUserRole } from '@/hooks/useUserRole'
import { useCartCount } from '@/hooks/useCartCount'
import { useWishlistCount } from '@/hooks/useWishlistCount'

export function HeaderMobile() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [wishlistOpen, setWishlistOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { t, locale } = useLanguage()
  const { role } = useUserRole()
  const { count: cartCount } = useCartCount()
  const { count: wishlistCount } = useWishlistCount()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    console.log('HeaderMobile: Current locale =', locale)
    console.log('HeaderMobile: t.nav.home =', t.nav?.home)
  }, [locale, t])

  // Fetch notifications from database
  const [notifications, setNotifications] = useState<Notification[]>([])
  
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { supabase } = await import('@/lib/supabase/client')
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        
        // Fetch notifications
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20)
        
        if (error) {
          console.error('Error fetching notifications:', error)
          return
        }
        
        if (data) {
          const formattedNotifications = data.map((notif: any) => ({
            id: notif.id,
            title: notif.title,
            message: notif.message,
            type: notif.type as 'order' | 'promotion' | 'general',
            read: notif.read,
            timestamp: new Date(notif.created_at),
            link: notif.link
          }))
          setNotifications(formattedNotifications)
        }
      } catch (error) {
        console.error('Error fetching notifications:', error)
      }
    }
    
    if (mounted) {
      fetchNotifications()
      
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [mounted])

  const unreadCount = notifications.filter(n => !n.read).length

  const handleMarkAsRead = async (id: string) => {
    try {
      const { supabase } = await import('@/lib/supabase/client')
      
      // Update in database
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
      
      if (error) {
        console.error('Error marking notification as read:', error)
        return
      }
      
      // Update local state
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      )
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const { supabase } = await import('@/lib/supabase/client')
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      // Update all unread notifications in database
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)
      
      if (error) {
        console.error('Error marking all notifications as read:', error)
        return
      }
      
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const navigation = [
    { name: t.nav.home, href: '/' },
    { name: t.nav.catalog, href: '/products' },
    { name: t.nav.contact, href: '/contact' },
    { name: t.nav.sale, href: '/products?sale=true' },
  ]

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
      <header className="sticky top-10 z-50 w-full bg-luxury-navy text-white shadow-lg lg:hidden relative">
        <nav className="container mx-auto px-3 md:px-4">
          <div className="flex h-16 items-center justify-between md:h-18">
            <button className="flex h-9 w-9 items-center justify-center rounded-lg transition-all hover:bg-white/10 md:h-10 md:w-10">
              <Menu className="h-5 w-5 md:h-6 md:w-6" aria-hidden="true" />
            </button>
            <Link href="/" className="absolute left-1/2 -translate-x-1/2">
              <span className="font-serif text-lg font-medium tracking-[0.25em] text-luxury-gold md:text-xl">
                MYKONOS
              </span>
            </Link>
            <div className="flex items-center gap-2 md:gap-3" />
          </div>
        </nav>
      </header>
    )
  }

  return (
    <header className="sticky top-10 z-50 w-full bg-luxury-navy text-white shadow-lg lg:hidden relative">
      <nav className="container mx-auto px-3 md:px-4">
        <div className="flex h-16 items-center justify-between md:h-18">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-all hover:bg-white/10 active:scale-95 focus:outline-none md:h-10 md:w-10"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5 md:h-6 md:w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5 md:h-6 md:w-6" aria-hidden="true" />
            )}
          </button>
          
          <Link href="/" className="absolute left-1/2 -translate-x-1/2">
            <span className="font-serif text-lg font-medium tracking-[0.15em] text-luxury-gold transition-all duration-300 hover:opacity-90 sm:text-xl sm:tracking-[0.2em] md:text-2xl md:tracking-[0.25em]">
              MYKONOS
            </span>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
            <NotificationIcon 
              count={unreadCount} 
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              isActive={notificationsOpen}
            />
            <button
              onClick={() => {
                setCartOpen(true)
              }}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg transition-all active:scale-95 md:h-10 md:w-10 hover:bg-white/10"
              aria-label="Shopping Cart"
            >
              <ShoppingBag className="h-4 w-4 md:h-5 md:w-5" aria-hidden="true" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-luxury-gold text-[10px] font-bold text-luxury-navy">
                  {cartCount}
                </span>
              )}
            </button>
            <Link 
              href="/account"
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg transition-all active:scale-95 md:h-10 md:w-10",
                pathname.startsWith('/account')
                  ? "bg-white/10 text-luxury-gold"
                  : "text-white hover:bg-white/10"
              )}
              aria-label="Account"
            >
              <User className="h-4 w-4 md:h-5 md:w-5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div 
          id="mobile-menu"
          className="absolute top-full left-0 right-0 max-h-[calc(100vh-5rem)] overflow-y-auto animate-slide-in-right border-t border-white/10 bg-luxury-navy-light shadow-2xl"
          role="navigation"
          aria-label="Mobile navigation"
        >
          <div className="px-4 py-6">

            <nav className="space-y-1" role="menu">
              <Link
                href="/"
                role="menuitem"
                className={cn(
                  "block rounded-lg px-4 py-4 text-base font-medium transition-all hover:bg-luxury-gold/20 active:scale-98",
                  pathname === '/' ? "bg-luxury-gold/20 text-luxury-gold" : "text-white"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {t.nav.home}
              </Link>

              <Link
                href="/products"
                role="menuitem"
                className={cn(
                  "block rounded-lg px-4 py-4 text-base font-medium transition-all hover:bg-luxury-gold/20 active:scale-98",
                  pathname === '/products' ? "bg-luxury-gold/20 text-luxury-gold" : "text-white"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {t.nav.catalog}
              </Link>

              <Link
                href="/contact"
                role="menuitem"
                className={cn(
                  "block rounded-lg px-4 py-4 text-base font-medium transition-all hover:bg-luxury-gold/20 active:scale-98",
                  pathname === '/contact' ? "bg-luxury-gold/20 text-luxury-gold" : "text-white"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {t.nav.contact}
              </Link>

              <Link
                href="/track-order"
                role="menuitem"
                className={cn(
                  "block rounded-lg px-4 py-4 text-base font-medium transition-all hover:bg-luxury-gold/20 active:scale-98",
                  pathname === '/track-order' ? "bg-luxury-gold/20 text-luxury-gold" : "text-white"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {t.header.trackOrder}
              </Link>

              {/* Wishlist and Admin */}
              <div className="pt-4 border-t border-white/10 mt-4 space-y-1">
                <button
                  onClick={() => {
                    setWishlistOpen(true)
                    setMobileMenuOpen(false)
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-4 py-4 text-base font-medium transition-all text-white hover:bg-luxury-gold/20"
                >
                  <div className="flex items-center gap-3">
                    <Heart className="h-5 w-5" />
                    <span>{t.header.wishlist}</span>
                  </div>
                  {wishlistCount > 0 && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-luxury-gold text-xs font-bold text-luxury-navy">
                      {wishlistCount}
                    </span>
                  )}
                </button>
                {role !== 'customer' && (
                  <Link
                    href="/cms"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-4 py-4 text-base font-medium transition-all hover:bg-luxury-gold/20",
                      pathname.startsWith('/cms')
                        ? "bg-luxury-gold/20 text-luxury-gold"
                        : "text-white"
                    )}
                  >
                    <Settings className="h-5 w-5" />
                    <span>Admin Panel</span>
                  </Link>
                )}
              </div>
              
              <div className="flex items-center justify-between rounded-lg px-4 py-4">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-white" />
                  <span className="text-base font-medium text-white">{t.header.region}</span>
                </div>  
                <RegionCurrencySelector />
              </div>
              <div className="flex items-center justify-between rounded-lg px-4 py-4">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-white" />
                  <span className="text-base font-medium text-white">{t.header.language}</span>
                </div>  
                <LanguageSwitcher />
              </div>
            </nav>
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
      
      <WishlistModal
        isOpen={wishlistOpen}
        onClose={() => setWishlistOpen(false)}
      />
      
      <CartModal
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
      />
    </header>
  )
}
