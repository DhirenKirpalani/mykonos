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
      className="group relative overflow-hidden rounded-lg bg-[#FBF9F5] shadow-[0_2px_8px_rgba(0,0,0,0.10)]"
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
          {/* Photographic gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6">
            <h3 className="mb-2 font-serif text-2xl font-bold text-white/95">
              {collection.name}
            </h3>
            <p className="mb-4 text-sm text-[#EDEBE6]/90">
              {collection.description}
            </p>
            <div className="flex items-center gap-2 text-sm font-medium text-white transition-all duration-300 group-hover:opacity-100 opacity-90">
              Explore Collection
              <ArrowRight className="h-4 w-4 text-[#C2A36B] transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
