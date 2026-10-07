'use client'

import { Breadcrumbs } from '@/components/common/Breadcrumbs'

export function PolicySkeleton() {
  return (
    <div className="min-h-screen bg-white animate-pulse">
      <div className="border-b border-border/40 bg-luxury-gray-light py-12">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="h-10 w-56 rounded bg-gray-200 mb-3" />
          <div className="h-4 w-36 rounded bg-gray-200" />
        </div>
      </div>
      <div className="container mx-auto px-4 py-12 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <div className="h-6 w-48 rounded bg-gray-200" />
              <div className="h-4 w-full rounded bg-gray-100" />
              <div className="h-4 w-5/6 rounded bg-gray-100" />
              <div className="h-4 w-4/6 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface PolicySection {
  title: string
  type: 'paragraphs' | 'list' | 'numbered_list' | 'subsections' | 'contact'
  highlight?: string
  intro?: string
  footer?: string
  content?: string[]
  subsections?: Array<{ title: string; content: string[] }>
}

interface PolicyContent {
  title: string
  subtitle?: string
  intro?: string
  consent?: string
  sections: PolicySection[]
}

export function PolicyPageRenderer({
  content,
  breadcrumbHref,
  updatedAt,
}: {
  content: PolicyContent
  breadcrumbHref: string
  updatedAt?: string | null
}) {
  const formattedDate = updatedAt
    ? new Date(updatedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : (content.subtitle || null)

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-border/40 bg-luxury-gray-light py-12">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="mb-6 hidden md:block">
            <Breadcrumbs items={[{ label: content.title, href: breadcrumbHref }]} />
          </div>
          <h1 className="font-playfair text-3xl font-bold tracking-[0.05em] text-luxury-navy md:text-4xl lg:text-5xl mb-4">
            {content.title}
          </h1>
          {formattedDate && (
            <p className="font-montserrat text-sm text-gray-500 tracking-wide">
              {updatedAt ? `Last updated: ${formattedDate}` : formattedDate}
            </p>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 lg:px-8 font-montserrat">
        <div className="mx-auto max-w-4xl space-y-8">
          {content.intro && (
            <p className="text-base leading-relaxed text-gray-700 md:text-lg">{content.intro}</p>
          )}

          {(content.sections || []).map((section, idx) => (
            <section key={idx}>
              <h2 className="mb-4 font-montserrat text-2xl font-bold text-luxury-navy">{section.title}</h2>
              <div className="space-y-4 text-gray-700">
                {section.highlight && (
                  <p className="rounded-lg bg-blue-50 p-4 text-blue-900">
                    <strong>{section.highlight}</strong>
                  </p>
                )}

                {section.intro && <p>{section.intro}</p>}

                {(section.type === 'paragraphs' || section.type === 'contact') &&
                  (section.content || []).map((para, pIdx) => (
                    <p key={pIdx}>{para}</p>
                  ))}

                {section.type === 'list' && (
                  <ul className="ml-6 list-disc space-y-2">
                    {(section.content || []).map((item, iIdx) => (
                      <li key={iIdx}>{item}</li>
                    ))}
                  </ul>
                )}

                {section.type === 'numbered_list' && (
                  <ol className="ml-6 list-decimal space-y-4">
                    {(section.content || []).map((item, iIdx) => (
                      <li key={iIdx}>{item}</li>
                    ))}
                  </ol>
                )}

                {section.type === 'subsections' &&
                  (section.subsections || []).map((sub, sIdx) => (
                    <div key={sIdx}>
                      <h3 className="mb-3 text-xl font-semibold text-luxury-navy">{sub.title}</h3>
                      <div className="space-y-3">
                        {(sub.content || []).map((line, lIdx) => (
                          <p key={lIdx}>{line}</p>
                        ))}
                      </div>
                    </div>
                  ))}

                {section.footer && <p>{section.footer}</p>}
              </div>
            </section>
          ))}

          {content.consent && (
            <section className="rounded-lg bg-luxury-gold p-6">
              <p className="text-base font-montserrat font-semibold leading-relaxed text-luxury-navy">
                {content.consent}
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
