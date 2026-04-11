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
import { useUserProfile } from '@/hooks/useUserProfile'

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
  const { profile, getInitials } = useUserProfile()
  const userInitials = getInitials()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch notifications from database
  const [notifications, setNotifications] = useState<Notification[]>([])
  
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        console.log('🔔 [NOTIFICATIONS] Starting fetch...')
        const { supabase } = await import('@/lib/supabase/client')
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        console.log('👤 [NOTIFICATIONS] User:', user ? {
          id: user.id,
          email: user.email,
          is_anonymous: user.is_anonymous
        } : 'No user')
        
        let data = null
        let error = null
        
        if (user && !user.is_anonymous) {
          // Authenticated user - fetch by user_id
          console.log('✅ [NOTIFICATIONS] Fetching for authenticated user:', user.id)
          const result = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20)
          
          data = result.data
          error = result.error
          console.log('📊 [NOTIFICATIONS] Authenticated query result:', {
            count: data?.length || 0,
            error: error?.message
          })
        } else {
          // Guest user - fetch notifications for recent orders from localStorage
          console.log('👤 [NOTIFICATIONS] Guest user detected, checking localStorage...')
          const orderHistory = localStorage.getItem('orderHistory')
          console.log('📦 [NOTIFICATIONS] orderHistory from localStorage:', orderHistory ? 'Found' : 'Not found')
          
          if (orderHistory) {
            try {
              const orders = JSON.parse(orderHistory)
              console.log('📋 [NOTIFICATIONS] Parsed orders:', {
                count: orders.length,
                orders: orders.map((o: any) => ({
                  id: o.id,
                  order_number: o.order_number,
                  customer_email: o.customer_email
                }))
              })
              
              if (orders.length > 0) {
                const mostRecentEmail = orders[0].customer_email
                
                // First, get order IDs from order_numbers (localStorage may not have IDs)
                const orderNumbers = orders.map((o: any) => o.order_number).filter(Boolean)
                
                console.log('🔍 [NOTIFICATIONS] Fetching order IDs from order_numbers:', {
                  email: mostRecentEmail,
                  orderNumbers: orderNumbers,
                  orderCount: orderNumbers.length
                })
                
                if (orderNumbers.length > 0) {
                  // First fetch the order IDs from order_numbers
                  const { data: orderData } = await supabase
                    .from('orders')
                    .select('id, order_number')
                    .in('order_number', orderNumbers)
                    .eq('customer_email', mostRecentEmail)
                  
                  const orderIds = (orderData || []).map((o: any) => o.id).filter(Boolean)
                  
                  console.log('📦 [NOTIFICATIONS] Fetched order IDs:', {
                    orderIds: orderIds,
                    count: orderIds.length
                  })
                  
                  if (orderIds.length > 0) {
                    // Fetch notifications for guest orders
                    console.log('📡 [NOTIFICATIONS] Fetching guest notifications...')
                    const result = await supabase
                      .from('notifications')
                      .select('*')
                      .is('user_id', null)
                      .in('order_id', orderIds)
                      .eq('customer_email', mostRecentEmail)
                      .order('created_at', { ascending: false })
                      .limit(20)
                    
                    data = result.data
                    error = result.error
                    
                    console.log('📊 [NOTIFICATIONS] Guest query result:', {
                      count: data?.length || 0,
                      error: error?.message,
                      data: data
                    })
                  } else {
                    console.log('⚠️ [NOTIFICATIONS] No valid order IDs found after fetching')
                  }
                } else {
                  console.log('⚠️ [NOTIFICATIONS] No valid order numbers found')
                }
              } else {
                console.log('⚠️ [NOTIFICATIONS] orderHistory is empty')
              }
            } catch (e) {
              console.error('❌ [NOTIFICATIONS] Error parsing order history:', e)
            }
          } else {
            console.log('⚠️ [NOTIFICATIONS] No orderHistory in localStorage')
          }
        }
        
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
          console.log('✅ [NOTIFICATIONS] Successfully formatted notifications:', {
            count: formattedNotifications.length,
            notifications: formattedNotifications
          })
          setNotifications(formattedNotifications)
        } else {
          console.log('⚠️ [NOTIFICATIONS] No data to format')
        }
      } catch (error) {
        console.error('❌ [NOTIFICATIONS] Error fetching notifications:', error)
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
      console.log('📝 [NOTIFICATIONS] Marking notification as read:', id)
      const { supabase } = await import('@/lib/supabase/client')
      
      // Update in database
      const { error, data } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
        .select()
      
      if (error) {
        console.error('❌ [NOTIFICATIONS] Error marking notification as read:', error)
        return
      }
      
      console.log('✅ [NOTIFICATIONS] Notification marked as read in database:', data)
      
      // Update local state
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      )
      
      console.log('✅ [NOTIFICATIONS] Local state updated')
    } catch (error) {
      console.error('❌ [NOTIFICATIONS] Error marking notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      console.log('📝 [NOTIFICATIONS] Marking all notifications as read')
      const { supabase } = await import('@/lib/supabase/client')
      
      // Get IDs of unread notifications
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
      
      if (unreadIds.length === 0) {
        console.log('⚠️ [NOTIFICATIONS] No unread notifications to mark')
        return
      }
      
      console.log('📋 [NOTIFICATIONS] Marking as read:', unreadIds)
      
      // Update all unread notifications in database
      const { error, data } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds)
        .select()
      
      if (error) {
        console.error('❌ [NOTIFICATIONS] Error marking all notifications as read:', error)
        return
      }
      
      console.log('✅ [NOTIFICATIONS] All notifications marked as read in database:', data)
      
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      
      console.log('✅ [NOTIFICATIONS] Local state updated')
    } catch (error) {
      console.error('❌ [NOTIFICATIONS] Error marking all notifications as read:', error)
    }
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
            <LanguageSwitcher />
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
                "flex h-10 w-10 items-center justify-center rounded-lg transition-all active:scale-95 font-semibold text-sm",
                pathname.startsWith('/account')
                  ? "bg-white/10 text-luxury-gold"
                  : "text-white hover:bg-white/10"
              )}
              aria-label="Account"
            >
              {userInitials ? (
                <span className="font-serif">{userInitials}</span>
              ) : (
                <User className="h-5 w-5" aria-hidden="true" />
              )}
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
