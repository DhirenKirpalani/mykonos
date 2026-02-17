'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'

export function PromotionSection() {
  return (
    <section className="relative bg-white py-8 md:py-12 lg:py-16">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative w-full overflow-hidden rounded-lg shadow-2xl cursor-pointer group"
        >
          <Image
            src="/assets/promotion/id-11134210-7r98w-lwiidi3v5xj137.webp"
            alt="Special Promotion"
            width={1200}
            height={600}
            className="w-full h-auto object-contain transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1200px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </motion.div>
      </div>
    </section>
  )
}
