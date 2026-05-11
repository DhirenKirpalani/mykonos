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
      { name: t.footer.privacyPolicy, href: '/privacy' },
    ],
  }

  const isActive = (href: string) => {
    return pathname === href
  }

  return (
    <footer className="bg-luxury-navy text-white overflow-hidden mt-8 sm:mt-10">
      <div className="container mx-auto px-4 py-6 sm:py-8 lg:px-8 max-w-full">
        <div className="flex flex-col gap-5 sm:gap-6 sm:grid sm:grid-cols-2 lg:grid-cols-4 break-words">
          {/* Brand Column */}
          <div className="overflow-hidden">
            <Link href="/" className="inline-block">
              <span
                className="font-montserrat text-2xl sm:text-3xl font-normal tracking-normal"
                style={{ background: 'linear-gradient(90deg, #D9B25E 0%, #FEE19D 50%, #D9B25E 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
              >
                MYKONOS
              </span>
            </Link>
            <div className="mt-4 sm:mt-6">
              <p className="text-xs sm:text-sm font-medium text-white">{t.footer.followUs}</p>
              <div className="mt-2 sm:mt-3 flex gap-3">
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
            <h3 className="text-xs sm:text-sm font-medium uppercase tracking-wider text-white">{t.footer.houseOfMykonos}</h3>
            <ul className="mt-3 sm:mt-4 space-y-1.5 sm:space-y-2">
              {footerLinks.about.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className={cn(
                      "text-xs sm:text-sm transition-colors hover:text-luxury-gold",
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
            <h3 className="text-xs sm:text-sm font-medium uppercase tracking-wider text-white">{t.footer.customerService}</h3>
            <ul className="mt-3 sm:mt-4 space-y-1.5 sm:space-y-2">
              {footerLinks.customerService.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className={cn(
                      "text-xs sm:text-sm transition-colors hover:text-luxury-gold",
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
            <h3 className="text-xs sm:text-sm font-medium uppercase tracking-wider text-white">{t.footer.legal}</h3>
            <ul className="mt-3 sm:mt-4 space-y-1.5 sm:space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className={cn(
                      "text-xs sm:text-sm transition-colors hover:text-luxury-gold",
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
        <div className="mt-6 sm:mt-8 border-t border-white/10 pt-4 sm:pt-6">
          <p className="text-center text-xs text-gray-400">
            © {new Date().getFullYear()} {t.footer.copyright}
          </p>
        </div>
      </div>
    </footer>
  )
}
