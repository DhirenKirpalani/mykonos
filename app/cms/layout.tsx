'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  Package, 
  FolderOpen, 
  Image as ImageIcon, 
  Tag, 
  ShoppingCart, 
  Users, 
  BarChart3 
} from 'lucide-react'
import { useUserRole } from '@/hooks/useUserRole'
import { canManageProducts, canManagePromotions, canManageOrders, canAccessCMS } from '@/lib/utils/permissions'

export default function CMSLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { role } = useUserRole()

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
      name: 'Analytics', 
      href: '/cms/analytics', 
      icon: BarChart3,
      show: role === 'admin' || role === 'marketing_manager'
    },
  ].filter(item => item.show)

  return (
    <div className="fixed inset-0 bg-gray-50">
      <div className="flex h-full">
        <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-luxury-navy text-white">
          <div className="flex h-full flex-col">
            <div className="flex h-16 items-center border-b border-white/10 px-6">
              <Link href="/cms" className="font-serif text-xl font-medium tracking-wider text-luxury-gold">
                MYKONOS CMS
              </Link>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-luxury-gold text-luxury-navy'
                        : 'text-white hover:bg-white/10'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
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
        <main className="ml-64 flex-1 overflow-y-auto">
          <div className="container mx-auto px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
