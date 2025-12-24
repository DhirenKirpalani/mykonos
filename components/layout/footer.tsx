import Link from 'next/link'
import { Instagram, Facebook, Twitter, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

const footerLinks = {
  shop: [
    { name: 'Catalog', href: '/products' },
    { name: 'Sale', href: '/products?sale=true' },
    { name: 'Collections', href: '/collections' },
    { name: 'New Arrivals', href: '/products?new=true' },
  ],
  about: [
    { name: 'Our Story', href: '/about' },
    { name: 'Contact Us', href: '/contact' },
  ],
  customerService: [
    { name: 'Shipping', href: '/shipping' },
    { name: 'Return & Refund', href: '/returns' },
    { name: 'Terms of Service', href: '/terms' },
    { name: 'FAQs', href: '/faqs' },
  ],
}

export function Footer() {
  return (
    <footer className="bg-luxury-navy text-white overflow-hidden">
      <div className="container mx-auto px-4 py-12 lg:px-8 max-w-full">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 break-words">
          <div className="lg:col-span-2 overflow-hidden">
            <Link href="/" className="inline-block">
              <span className="font-serif text-2xl font-bold tracking-tight text-luxury-gold break-words">
                MYKONOS
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-gray-300 break-words">
              Discover the art of fine perfumery. Each fragrance is a masterpiece,
              crafted with the finest ingredients from around the world.
            </p>
            <div className="mt-6 overflow-hidden">
              <a
                href="https://wa.me/6285780218514"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-luxury-gold transition-colors hover:text-luxury-gold-light break-all"
              >
                <MessageCircle className="h-4 w-4 flex-shrink-0" />
                <span className="break-all">WhatsApp: +62 857-8021-8514</span>
              </a>
            </div>
            <div className="mt-6 overflow-hidden">
              <p className="text-sm font-medium text-white">Subscribe to our newsletter</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="w-full flex-1 rounded-md border border-white/20 bg-luxury-navy-light px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:border-luxury-gold focus:outline-none focus:ring-1 focus:ring-luxury-gold"
                />
                <Button variant="luxury" size="sm" className="w-full sm:w-auto">
                  Subscribe
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile: Horizontal sections */}
          <div className="col-span-1 grid grid-cols-3 gap-6 lg:col-span-3 lg:grid-cols-3">
            <div>
              <h3 className="font-medium text-white">Shop</h3>
              <ul className="mt-4 space-y-2">
                {footerLinks.shop.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-300 transition-colors hover:text-luxury-gold"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-white">About</h3>
              <ul className="mt-4 space-y-2">
                {footerLinks.about.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-300 transition-colors hover:text-luxury-gold"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-white">Customer Service</h3>
              <ul className="mt-4 space-y-2">
                {footerLinks.customerService.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-300 transition-colors hover:text-luxury-gold"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-8">
          <div className="flex justify-center gap-4 mb-4">
            <Link
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 transition-colors hover:text-luxury-gold"
            >
              <Instagram className="h-5 w-5" />
            </Link>
            <Link
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 transition-colors hover:text-luxury-gold"
            >
              <Facebook className="h-5 w-5" />
            </Link>
            <Link
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 transition-colors hover:text-luxury-gold"
            >
              <Twitter className="h-5 w-5" />
            </Link>
          </div>
          <p className="text-center text-sm text-gray-400">
            © {new Date().getFullYear()} Mykonos. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
