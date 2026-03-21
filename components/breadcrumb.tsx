'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export type BreadcrumbItem = {
  label: string
  href: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  const { t } = useLanguage()
  
  return (
    <nav className="flex items-center space-x-2 text-sm" aria-label="Breadcrumb">
      <Link 
        href="/" 
        className="text-[#0055AA] hover:underline transition-colors"
      >
        {t.common.home}
      </Link>
      
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        
        return (
          <div key={item.href} className="flex items-center space-x-2">
            <ChevronRight className="h-4 w-4 text-gray-400" />
            {isLast ? (
              <span className="text-gray-900 font-medium">{item.label}</span>
            ) : (
              <Link 
                href={item.href}
                className="text-[#0055AA] hover:underline transition-colors"
              >
                {item.label}
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}
