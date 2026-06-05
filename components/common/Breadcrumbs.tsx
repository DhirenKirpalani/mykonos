'use client'

import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { usePathname } from 'next/navigation'

interface BreadcrumbItem {
  label: string
  href: string
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[]
  variant?: 'light' | 'default'
}

export function Breadcrumbs({ items, variant = 'default' }: BreadcrumbsProps) {
  const pathname = usePathname()

  // Auto-generate breadcrumbs from pathname if not provided
  const breadcrumbs = items || generateBreadcrumbs(pathname)

  const isLight = variant === 'light'
  const textColor = isLight ? 'text-white/60' : 'text-muted-foreground'
  const textHoverColor = isLight ? 'hover:text-white' : 'hover:text-foreground'
  const activeColor = isLight ? 'text-white' : 'text-foreground'

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
      <Link
        href="/"
        className={`flex items-center gap-1 ${textColor} transition-colors ${textHoverColor}`}
        aria-label="Home"
      >
        <Home className="h-4 w-4" />
      </Link>
      {breadcrumbs.map((item, index) => (
        <div key={item.href} className="flex items-center gap-2">
          <ChevronRight className={`h-4 w-4 ${textColor}`} />
          {index === breadcrumbs.length - 1 ? (
            <span className={`font-medium ${activeColor}`} aria-current="page">
              {item.label}
            </span>
          ) : (
            <Link
              href={item.href}
              className={`${textColor} transition-colors ${textHoverColor}`}
            >
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = []

  let currentPath = ''
  for (const segment of segments) {
    currentPath += `/${segment}`
    breadcrumbs.push({
      label: formatSegment(segment),
      href: currentPath,
    })
  }

  return breadcrumbs
}

function formatSegment(segment: string): string {
  // Convert kebab-case or snake_case to Title Case
  return segment
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
