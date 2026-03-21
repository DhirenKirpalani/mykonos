'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Home, ArrowLeft, Search, Package } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export default function NotFound() {
  const router = useRouter()
  const { t } = useLanguage()

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5EFE6] via-[#E8DCC4] to-[#D4C5A0] flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* 404 Number */}
          <motion.h1 
            className="text-[120px] md:text-[180px] font-serif font-bold text-[#1C2E4A] leading-none mb-4"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            404
          </motion.h1>

          {/* Title */}
          <motion.h2
            className="text-2xl md:text-4xl font-serif font-bold text-[#1C2E4A] mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Page Not Found
          </motion.h2>

          {/* Description */}
          <motion.p
            className="text-base md:text-lg text-[#5A4A3A] mb-8 max-w-md mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            The page you're looking for doesn't exist or has been moved. Let's get you back on track.
          </motion.p>

          {/* Action Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {/* Go Back Button */}
            <button
              onClick={() => router.back()}
              className="
                group
                flex items-center gap-2
                px-6 py-3
                bg-white
                text-[#1C2E4A]
                rounded-lg
                font-medium
                shadow-md
                hover:shadow-lg
                transition-all duration-300
                hover:scale-105
              "
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              Go Back
            </button>

            {/* Home Button */}
            <Link
              href="/"
              className="
                group
                flex items-center gap-2
                px-6 py-3
                bg-[#1C2E4A]
                text-white
                rounded-lg
                font-medium
                shadow-md
                hover:shadow-lg
                transition-all duration-300
                hover:scale-105
              "
            >
              <Home className="w-5 h-5" />
              Home
            </Link>

            {/* Products Button */}
            <Link
              href="/products"
              className="
                group
                flex items-center gap-2
                px-6 py-3
                bg-luxury-gold
                text-white
                rounded-lg
                font-medium
                shadow-md
                hover:shadow-lg
                transition-all duration-300
                hover:scale-105
              "
            >
              <Package className="w-5 h-5" />
              Browse Products
            </Link>
          </motion.div>

          {/* Decorative Element */}
          <motion.div
            className="mt-12 flex justify-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="w-2 h-2 rounded-full bg-[#1C2E4A] animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-luxury-gold animate-pulse delay-100" />
            <div className="w-2 h-2 rounded-full bg-[#1C2E4A] animate-pulse delay-200" />
          </motion.div>

          {/* Popular Links */}
          <motion.div
            className="mt-12 pt-8 border-t border-[#1C2E4A]/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <p className="text-sm text-[#5A4A3A] mb-4 font-medium">Popular Pages</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/products"
                className="text-sm text-[#1C2E4A] hover:text-luxury-gold transition-colors underline"
              >
                All Products
              </Link>
              <Link
                href="/about"
                className="text-sm text-[#1C2E4A] hover:text-luxury-gold transition-colors underline"
              >
                About Us
              </Link>
              <Link
                href="/account"
                className="text-sm text-[#1C2E4A] hover:text-luxury-gold transition-colors underline"
              >
                My Account
              </Link>
              <Link
                href="/cart"
                className="text-sm text-[#1C2E4A] hover:text-luxury-gold transition-colors underline"
              >
                Shopping Cart
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
