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
  variant?: 'light' | 'dark'
}

export function Breadcrumb({ items, variant = 'light' }: BreadcrumbProps) {
  const { t } = useLanguage()
  
  const isDark = variant === 'dark'
  
  return (
    <nav className="flex items-center space-x-2 text-sm" aria-label="Breadcrumb">
      <Link 
        href="/" 
        className={isDark 
          ? "text-white/70 hover:text-white hover:underline transition-colors" 
          : "text-[#0055AA] hover:underline transition-colors"
        }
      >
        {t.common.home}
      </Link>
      
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        
        return (
          <div key={item.href} className="flex items-center space-x-2">
            <ChevronRight className={isDark ? "h-4 w-4 text-white/40" : "h-4 w-4 text-gray-400"} />
            {isLast ? (
              <span className={isDark ? "text-white font-medium" : "text-gray-900 font-medium"}>{item.label}</span>
            ) : (
              <Link 
                href={item.href}
                className={isDark 
                  ? "text-white/70 hover:text-white hover:underline transition-colors" 
                  : "text-[#0055AA] hover:underline transition-colors"
                }
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
