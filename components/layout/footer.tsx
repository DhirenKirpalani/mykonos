'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Instagram } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FaTiktok } from 'react-icons/fa'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'

export function Footer() {
  const pathname = usePathname()
  const { t } = useLanguage()

  const footerLinks = {
    about: [
      { name: t.footer.ourStory, href: '/about' },
    ],
    customerService: [
      { name: t.footer.shippingPolicy, href: '/shipping' },
      { name: t.footer.returnPolicy, href: '/returns' },
      { name: t.footer.helpCenter, href: '/faqs' },
      { name: t.footer.contactUs, href: '/contact' },
    ],
    legal: [
      { name: t.footer.termsConditions, href: '/terms' },
      { name: t.footer.privacyPolicy, href: '/terms' },
    ],
  }

  const isActive = (href: string) => {
    return pathname === href
  }

  return (
    <footer className="bg-luxury-navy text-white overflow-hidden">
      <div className="container mx-auto px-4 py-8 sm:py-12 lg:px-8 max-w-full">
        <div className="flex flex-col gap-8 sm:grid sm:grid-cols-2 lg:grid-cols-4 break-words">
          {/* Brand Column */}
          <div className="overflow-hidden">
            <Link href="/" className="inline-block">
              <span className="font-canela text-2xl font-medium tracking-[0.25em] text-luxury-gold">
                MYKONOS
              </span>
            </Link>
            <div className="mt-6">
              <p className="text-sm font-medium text-white">{t.footer.followUs}</p>
              <div className="mt-3 flex gap-3">
                <Link
                  href="https://www.instagram.com/officialmykonos/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-gray-300 transition-colors hover:border-luxury-gold hover:text-luxury-gold"
                >
                  <Instagram className="h-4 w-4" />
                </Link>
                <Link
                  href="https://www.tiktok.com/@mykonosofficial"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-gray-300 transition-colors hover:border-luxury-gold hover:text-luxury-gold"
                >
                  <FaTiktok className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* About Column */}
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wider text-white">{t.footer.houseOfMykonos}</h3>
            <ul className="mt-4 space-y-2">
              {footerLinks.about.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className={cn(
                      "text-sm transition-colors hover:text-luxury-gold",
                      isActive(link.href) ? "text-luxury-gold" : "text-gray-300"
                    )}
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Service Column */}
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wider text-white">{t.footer.customerService}</h3>
            <ul className="mt-4 space-y-2">
              {footerLinks.customerService.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className={cn(
                      "text-sm transition-colors hover:text-luxury-gold",
                      isActive(link.href) ? "text-luxury-gold" : "text-gray-300"
                    )}
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wider text-white">{t.footer.legal}</h3>
            <ul className="mt-4 space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className={cn(
                      "text-sm transition-colors hover:text-luxury-gold",
                      isActive(link.href) ? "text-luxury-gold" : "text-gray-300"
                    )}
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright Section */}
        <div className="mt-8 border-t border-white/10 pt-6">
          <p className="text-center text-xs text-gray-400">
            © {new Date().getFullYear()} {t.footer.copyright}
          </p>
        </div>
      </div>
    </footer>
  )
}
