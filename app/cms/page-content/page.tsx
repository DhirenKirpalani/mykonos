'use client'

import Link from 'next/link'
import { FileText, ChevronRight } from 'lucide-react'

const PAGES = [
  { key: 'about', label: 'About Us', description: 'Hero banner images, content sections, CTA block' },
  { key: 'shipping', label: 'Shipping Policy', description: 'Shipping methods, processing notes, delivery schedule' },
  { key: 'returns', label: 'Refund Policy', description: 'Return conditions, damage claims, refund process' },
  { key: 'faqs', label: 'Help Center / FAQs', description: 'FAQ categories and question-answer pairs' },
  { key: 'terms', label: 'Terms of Service', description: 'General terms, changes, privacy, content ownership' },
  { key: 'privacy', label: 'Privacy Policy', description: 'Data collection, usage, cookies, user rights' },
]

export default function PageContentIndex() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-luxury-navy">Page Content</h1>
        <p className="text-sm text-gray-500 mt-1">Manage copywriting for all public pages (supports English & Indonesian)</p>
      </div>

      <div className="grid gap-3">
        {PAGES.map((page) => (
          <Link
            key={page.key}
            href={`/cms/page-content/${page.key}`}
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-5 hover:border-luxury-navy/40 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-luxury-navy/5 group-hover:bg-luxury-navy/10 transition-colors">
                <FileText className="h-5 w-5 text-luxury-navy" />
              </div>
              <div>
                <p className="font-semibold text-luxury-navy">{page.label}</p>
                <p className="text-sm text-gray-500 mt-0.5">{page.description}</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-luxury-navy transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  )
}
