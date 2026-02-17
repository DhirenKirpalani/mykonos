'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Search, ShoppingBag, User, Menu, X, Settings, ChevronDown, Heart } from 'lucide-react'
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
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [wishlistOpen, setWishlistOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [catalogExpanded, setCatalogExpanded] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { t } = useLanguage()
  const { role } = useUserRole()
  const { count: cartCount } = useCartCount()
  const { count: wishlistCount } = useWishlistCount()

  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'Order Shipped',
      message: 'Your order #12345 has been shipped and is on its way!',
      type: 'order',
      read: false,
      timestamp: new Date(Date.now() - 3600000),
    },
    {
      id: '2',
      title: 'New Arrivals',
      message: 'Check out our latest collection of Mediterranean fragrances.',
      type: 'promotion',
      read: false,
      timestamp: new Date(Date.now() - 7200000),
    },
    {
      id: '3',
      title: 'Welcome to Mykonos',
      message: 'Thank you for joining us! Enjoy 10% off your first order.',
      type: 'general',
      read: true,
      timestamp: new Date(Date.now() - 86400000),
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

  return (
    <header className="sticky top-10 z-50 w-full bg-luxury-navy text-white shadow-lg lg:hidden relative">
      <nav className="container mx-auto px-3 md:px-4">
        <div className="flex h-16 items-center justify-between md:h-18">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-all hover:bg-white/10 active:scale-95 focus:outline-none focus:ring-2 focus:ring-luxury-gold focus:ring-offset-2 focus:ring-offset-luxury-navy md:h-10 md:w-10"
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
            <span className="font-serif text-xl font-medium tracking-[0.2em] text-luxury-gold transition-all duration-300 hover:opacity-90 md:text-2xl md:tracking-[0.25em]">
              MYKONOS
            </span>
          </Link>

          <div className="flex items-center gap-2 md:gap-3">
            {role !== 'customer' && (
              <Link
                href="/cms"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg transition-all active:scale-95 md:h-10 md:w-10",
                  pathname.startsWith('/cms')
                    ? "bg-white/10 text-luxury-gold"
                    : "hover:bg-white/10"
                )}
                aria-label="Admin Panel"
              >
                <Settings className="h-4 w-4 md:h-5 md:w-5" aria-hidden="true" />
              </Link>
            )}
            <NotificationIcon 
              count={unreadCount} 
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              isActive={notificationsOpen}
            />
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
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Search..."
                  aria-label="Search products"
                  className="w-full rounded-lg border border-luxury-gold/30 bg-luxury-navy-dark py-3 pl-12 pr-4 text-sm text-white placeholder:text-gray-400 transition-all focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/50"
                />
              </div>
            </div>

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

              {/* Expandable Catalog */}
              <div>
                <button
                  onClick={() => setCatalogExpanded(!catalogExpanded)}
                  className="w-full flex items-center justify-between rounded-lg px-4 py-4 text-base font-medium text-white transition-all hover:bg-luxury-gold/20"
                >
                  <span>{t.nav.catalog}</span>
                  <ChevronDown className={cn(
                    "h-5 w-5 transition-transform",
                    catalogExpanded && "rotate-180"
                  )} />
                </button>
                {catalogExpanded && (
                  <div className="ml-4 mt-1 space-y-1 border-l-2 border-luxury-gold/30 pl-4">
                    <Link
                      href="/products"
                      className={cn(
                        "block rounded-lg px-4 py-3 text-sm transition-all",
                        pathname === '/products' && !searchParams.toString()
                          ? "bg-luxury-gold/20 text-luxury-gold"
                          : "text-white/80 hover:bg-luxury-gold/20 hover:text-white"
                      )}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      All Products
                    </Link>
                    <Link
                      href="/products?category=perfume"
                      className={cn(
                        "block rounded-lg px-4 py-3 text-sm transition-all",
                        pathname === '/products' && searchParams.get('category') === 'perfume'
                          ? "bg-luxury-gold/20 text-luxury-gold"
                          : "text-white/80 hover:bg-luxury-gold/20 hover:text-white"
                      )}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Perfumes
                    </Link>
                    <Link
                      href="/products?category=cologne"
                      className={cn(
                        "block rounded-lg px-4 py-3 text-sm transition-all",
                        pathname === '/products' && searchParams.get('category') === 'cologne'
                          ? "bg-luxury-gold/20 text-luxury-gold"
                          : "text-white/80 hover:bg-luxury-gold/20 hover:text-white"
                      )}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Colognes
                    </Link>
                    <Link
                      href="/products?sale=true"
                      className={cn(
                        "block rounded-lg px-4 py-3 text-sm transition-all",
                        pathname === '/products' && searchParams.get('sale') === 'true'
                          ? "bg-luxury-gold/20 text-luxury-gold"
                          : "text-white/80 hover:bg-luxury-gold/20 hover:text-white"
                      )}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Sale Items
                    </Link>
                  </div>
                )}
              </div>

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

              {/* Wishlist and Cart */}
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
                    <span>Wishlist</span>
                  </div>
                  {wishlistCount > 0 && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-luxury-gold text-xs font-bold text-luxury-navy">
                      {wishlistCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => {
                    setCartOpen(true)
                    setMobileMenuOpen(false)
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-4 py-4 text-base font-medium transition-all text-white hover:bg-luxury-gold/20"
                >
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="h-5 w-5" />
                    <span>Cart</span>
                  </div>
                  {cartCount > 0 && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-luxury-gold text-xs font-bold text-luxury-navy">
                      {cartCount}
                    </span>
                  )}
                </button>
              </div>
              
              <div className="pt-4 border-t border-white/10 mt-4 space-y-2">
                <div className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-luxury-gold/20 transition-all">
                  <span className="text-base font-medium text-white">Region</span>
                  <RegionCurrencySelector />
                </div>
                <div className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-luxury-gold/20 transition-all">
                  <span className="text-base font-medium text-white">Language</span>
                  <LanguageSwitcher />
                </div>
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
