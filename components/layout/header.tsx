'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Search, ShoppingBag, User, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useLanguage } from '@/contexts/LanguageContext'

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { t } = useLanguage()

  const navigation = [
    { name: t.nav.home, href: '/' },
    { name: t.nav.catalog, href: '/products' },
    { name: t.nav.contact, href: '/contact' },
    { name: t.nav.sale, href: '/products?sale=true' },
  ]

  // Close search when pathname changes
  useEffect(() => {
    setSearchOpen(false)
  }, [pathname])

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    
    // For links with query parameters
    if (href.includes('?')) {
      const [path, query] = href.split('?')
      if (pathname !== path) return false
      
      // Check if query params match
      const params = new URLSearchParams(query)
      const paramsArray = Array.from(params.entries())
      for (const [key, value] of paramsArray) {
        if (searchParams.get(key) !== value) return false
      }
      return true
    }
    
    // For regular paths, only match if no query params present
    return pathname.startsWith(href) && !searchParams.toString()
  }

  return (
    <header className="sticky top-10 z-50 w-full bg-luxury-navy text-white shadow-lg">
      <nav className="container mx-auto px-3 md:px-4 lg:px-8">
        {/* Mobile-first header */}
        <div className="flex h-16 items-center justify-between md:h-18 lg:justify-center">
          {/* Mobile menu button - left side */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg transition-all hover:bg-white/10 active:scale-95 md:h-10 md:w-10 lg:hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5 md:h-6 md:w-6" />
            ) : (
              <Menu className="h-5 w-5 md:h-6 md:w-6" />
            )}
          </button>

          {/* Left spacer for desktop centering */}
          <div className="hidden lg:block lg:flex-1"></div>
          
          {/* Centered Brand Name */}
          <Link href="/" className="absolute left-1/2 -translate-x-1/2 lg:static lg:translate-x-0">
            <span className="font-serif text-xl font-medium tracking-[0.2em] text-luxury-gold transition-all duration-300 hover:opacity-90 md:text-2xl md:tracking-[0.25em] lg:text-4xl lg:tracking-[0.25em]">
              MYKONOS
            </span>
          </Link>

          {/* Right spacer and icons */}
          <div className="flex items-center gap-1.5 text-white md:gap-3 lg:flex-1 lg:justify-end lg:gap-4">
            <LanguageSwitcher />
            <button 
              className={cn(
                "hidden h-9 w-9 items-center justify-center rounded-lg transition-all active:scale-95 md:flex md:h-10 md:w-10",
                searchOpen 
                  ? "bg-white/10 text-luxury-gold" 
                  : "text-white hover:bg-white/10"
              )}
              onClick={() => setSearchOpen(!searchOpen)}
              aria-label="Search"
            >
              <Search className="h-4 w-4 md:h-5 md:w-5" />
            </button>
            <Link 
              href="/cart"
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg transition-all active:scale-95 md:h-10 md:w-10",
                pathname === '/cart'
                  ? "bg-white/10 text-luxury-gold"
                  : "text-white hover:bg-white/10"
              )}
              aria-label="Shopping cart"
            >
              <ShoppingBag className="h-4 w-4 md:h-5 md:w-5" />
            </Link>
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
              <User className="h-4 w-4 md:h-5 md:w-5" />
            </Link>
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden border-t border-white/10 lg:block">
          <div className="flex items-center justify-center gap-10 py-5">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "text-sm font-medium uppercase tracking-wider transition-all hover:text-luxury-gold",
                  isActive(item.href)
                    ? "text-luxury-gold border-b-2 border-luxury-gold pb-1"
                    : "text-white"
                )}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Search overlay */}
      {searchOpen && (
        <div className="animate-fade-in border-t border-white/10 bg-luxury-navy-light px-4 py-6">
          <div className="container mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                placeholder="Search for fragrances..."
                className="w-full rounded-lg border border-luxury-gold/30 bg-luxury-navy-dark py-4 pl-12 pr-4 text-sm text-white placeholder:text-gray-400 transition-all focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/50"
                autoFocus
              />
            </div>
          </div>
        </div>
      )}

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="animate-slide-in-right border-t border-white/10 bg-luxury-navy-light lg:hidden">
          <div className="px-4 py-6">
            {/* Mobile search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  placeholder="Search..."
                  className="w-full rounded-lg border border-luxury-gold/30 bg-luxury-navy-dark py-3 pl-12 pr-4 text-sm text-white placeholder:text-gray-400 transition-all focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/50"
                />
              </div>
            </div>

            {/* Navigation links */}
            <nav className="space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "block rounded-lg px-4 py-4 text-base font-medium transition-all hover:bg-luxury-gold/20 active:scale-98",
                    isActive(item.href)
                      ? "bg-luxury-gold/20 text-luxury-gold"
                      : "text-white"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

          </div>
        </div>
      )}
    </header>
  )
}
