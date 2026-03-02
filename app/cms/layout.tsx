'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { 
  LayoutDashboard, 
  Package, 
  FolderOpen, 
  Image as ImageIcon, 
  Tag, 
  ShoppingCart, 
  Users, 
  BarChart3,
  Settings,
  User,
  Menu,
  X,
  MessageCircle
} from 'lucide-react'
import { useUserRole } from '@/hooks/useUserRole'
import { canManageProducts, canManagePromotions, canManageOrders, canAccessCMS } from '@/lib/utils/permissions'
import { Toaster } from 'sonner'

export default function CMSLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { role } = useUserRole()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // Fetch unread message count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (role !== 'admin') return
      
      try {
        const response = await fetch('/api/chat/unread-count', {
          credentials: 'include'
        })
        if (response.ok) {
          const { count } = await response.json()
          setUnreadCount(count)
        }
      } catch (error) {
        console.error('Failed to fetch unread count:', error)
      }
    }

    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000) // Update every 30 seconds

    // Listen for messages being read
    const handleMessagesRead = () => {
      fetchUnreadCount()
    }
    window.addEventListener('chat-messages-read', handleMessagesRead)

    return () => {
      clearInterval(interval)
      window.removeEventListener('chat-messages-read', handleMessagesRead)
    }
  }, [role])

  const navigation = [
    { 
      name: 'Dashboard', 
      href: '/cms', 
      icon: LayoutDashboard,
      show: true
    },
    { 
      name: 'Products', 
      href: '/cms/products', 
      icon: Package,
      show: canManageProducts(role)
    },
    { 
      name: 'Collections', 
      href: '/cms/collections', 
      icon: FolderOpen,
      show: canAccessCMS(role)
    },
    { 
      name: 'Banners', 
      href: '/cms/banners', 
      icon: ImageIcon,
      show: canAccessCMS(role)
    },
    { 
      name: 'Promo Codes', 
      href: '/cms/promo-codes', 
      icon: Tag,
      show: canManagePromotions(role)
    },
    { 
      name: 'Orders', 
      href: '/cms/orders', 
      icon: ShoppingCart,
      show: canManageOrders(role)
    },
    { 
      name: 'Customers', 
      href: '/cms/customers', 
      icon: Users,
      show: role === 'admin' || role === 'support_agent'
    },
    { 
      name: 'Chat', 
      href: '/cms/chat', 
      icon: MessageCircle,
      show: role === 'admin'
    },
    { 
      name: 'User Management', 
      href: '/cms/users', 
      icon: Users,
      show: role === 'admin'
    },
    { 
      name: 'Analytics', 
      href: '/cms/analytics', 
      icon: BarChart3,
      show: role === 'admin' || role === 'marketing_manager'
    },
    { 
      name: 'Profile', 
      href: '/cms/profile', 
      icon: User,
      show: true
    },
    { 
      name: 'Settings', 
      href: '/cms/settings', 
      icon: Settings,
      show: role === 'admin'
    },
  ].filter(item => item.show)

  return (
    <div className="fixed inset-0 bg-gray-50">
      <Toaster position="top-center" richColors closeButton />
      {/* Mobile menu button */}
      <div className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between bg-luxury-navy px-4 lg:hidden">
        <Link href="/cms" className="font-serif text-xl font-medium tracking-wider text-luxury-gold">
          MYKONOS CMS
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="rounded-lg p-2 text-white hover:bg-white/10"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className="flex h-full">
        <aside className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-luxury-navy text-white transition-transform duration-300 lg:translate-x-0",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex h-full flex-col">
            <div className="flex h-16 items-center border-b border-white/10 px-6">
              <Link href="/cms" className="font-serif text-xl font-medium tracking-wider text-luxury-gold">
                MYKONOS CMS
              </Link>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {navigation.map((item) => {
                // Highlight if exact match or if current path starts with the item's path (for child routes)
                const isActive = pathname === item.href || 
                  (item.href !== '/cms' && pathname.startsWith(item.href + '/'))
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-luxury-gold text-luxury-navy'
                        : 'text-white hover:bg-white/10'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                    {item.name === 'Chat' && unreadCount > 0 && (
                      <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>
            <div className="border-t border-white/10 p-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-sm text-white/70 hover:text-white"
              >
                ← Back to Store
              </Link>
            </div>
          </div>
        </aside>
        <main className="ml-0 flex-1 overflow-y-auto pt-16 lg:ml-64 lg:pt-0">
          <div className="container mx-auto px-4 py-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
