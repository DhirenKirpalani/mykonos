'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { cn } from '@/lib/utils'

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isLoading } = useAuth()
  const { t } = useLanguage()

  // Redirect unauthenticated users — handled asynchronously so the shell never blocks
  useEffect(() => {
    if (!isLoading && (!user || user.is_anonymous)) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  // Order detail pages have their own standalone full-screen layout — passthrough
  const isOrderDetail = /^\/account\/orders\/[^/]+$/.test(pathname)
  if (isOrderDetail) {
    return <>{children}</>
  }

  // Prevent the full layout shell from flashing while auth is still resolving
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-luxury-gold/30 border-t-luxury-gold" />
      </div>
    )
  }

  // Don't render layout for unauthenticated users
  if (!user || user.is_anonymous) {
    return null
  }

  const getBreadcrumbs = () => {
    if (pathname.startsWith('/account/orders')) return [
      { label: t.account.account, href: '/account' },
      { label: t.account.orders, href: '/account/orders' },
    ]
    if (pathname === '/account/settings') return [
      { label: t.account.account, href: '/account' },
      { label: t.account.settings, href: '/account/settings' },
    ]
    if (pathname === '/account/addresses') return [
      { label: t.account.account, href: '/account' },
      { label: t.account.shippingAddresses, href: '/account/addresses' },
    ]
    return [{ label: t.account.account, href: '/account' }]
  }

  const getTitle = () => {
    if (pathname.startsWith('/account/orders')) return t.account.orders
    if (pathname === '/account/settings') return t.account.settings
    if (pathname === '/account/addresses') return t.account.shippingAddresses
    return t.account.myAccount
  }

  const navItems = [
    { href: '/account', label: t.account.profile, active: pathname === '/account' },
    { href: '/account/orders', label: t.account.orders, active: pathname.startsWith('/account/orders') },
    { href: '/account/settings', label: t.account.settings, active: pathname === '/account/settings' },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Full-width page header */}
      <div className="border-b border-border/40 bg-luxury-gray-light py-6 md:py-10">
        <div className="container mx-auto px-4 lg:px-8">
          <Breadcrumbs items={getBreadcrumbs()} />
          <h1 className="mt-3 mb-0 font-serif text-3xl font-bold md:text-4xl lg:text-5xl">
            {getTitle()}
          </h1>
        </div>
      </div>

      {/* Mobile horizontal tab nav — hidden on lg+ */}
      <div className="lg:hidden border-b border-border/40 bg-white sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex py-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex-1 rounded-full py-2 text-center text-sm font-medium transition-colors',
                  item.active
                    ? 'bg-luxury-gold text-white'
                    : 'text-muted-foreground hover:bg-luxury-gray-light hover:text-foreground'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="container mx-auto px-4 py-6 md:py-10 lg:px-8 lg:py-12">
        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          {/* Desktop sidebar — hidden on mobile */}
          <aside className="hidden lg:block space-y-2">
            <h2 className="mb-4 font-serif text-xl font-bold">{t.account.account}</h2>
            <nav className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'block w-full rounded-md px-4 py-2.5 text-left text-sm transition-colors',
                    item.active
                      ? 'bg-luxury-gold text-white font-medium'
                      : 'hover:bg-luxury-gray-light'
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <div className="lg:col-span-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
