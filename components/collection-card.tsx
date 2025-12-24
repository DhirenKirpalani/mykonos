'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Database } from '@/lib/supabase/database.types'

type Collection = Database['public']['Tables']['collections']['Row']

interface CollectionCardProps {
  collection: Collection
}

export function CollectionCard({ collection }: CollectionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="group relative overflow-hidden rounded-lg"
    >
      <Link href={`/collections/${collection.slug}`}>
        <div className="relative aspect-[4/5] overflow-hidden">
          <Image
            src={collection.hero_image_url}
            alt={collection.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 text-white">
            <h3 className="mb-2 font-serif text-2xl font-bold">
              {collection.name}
            </h3>
            <p className="mb-4 text-sm text-white/90">
              {collection.description}
            </p>
            <div className="flex items-center gap-2 text-sm font-medium transition-transform group-hover:translate-x-2">
              Explore Collection
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
