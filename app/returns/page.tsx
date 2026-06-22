'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { usePageContent } from '@/hooks/usePageContent'
import { PolicyPageRenderer } from '@/components/PolicyPageRenderer'

export default function ReturnsPage() {
  const { t, locale } = useLanguage()
  const { content } = usePageContent('returns', locale)

  if (content) {
    return <PolicyPageRenderer content={content} breadcrumbHref="/returns" />
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-border/40 bg-luxury-gray-light py-12">
        <div className="container mx-auto px-4 lg:px-8">
          {/* Breadcrumb - Desktop only */}
          <div className="mb-6 hidden md:block">
            <Breadcrumbs 
              items={[
                { label: t.returns?.title || 'Return Policy', href: '/returns' }
              ]} 
            />
          </div>
          <h1 className="font-playfair text-3xl font-bold tracking-[0.05em] text-luxury-navy md:text-4xl lg:text-5xl mb-4">
            {t.returns.title}
          </h1>
          <p className="font-montserrat text-sm text-gray-500 tracking-wide">
            {t.returns.subtitle}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 lg:px-8 font-montserrat">
        <div className="mx-auto max-w-4xl space-y-8">
          <section>
            <h2 className="mb-4 text-2xl font-bold text-luxury-navy">{t.returns.returnsExchanges}</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                {t.returns.returnPolicy}
              </p>
              <p>
                {t.returns.returnContact}
              </p>
              <p>
                {t.returns.exchangeProcess}
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold text-luxury-navy">{t.returns.damagesIssues}</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                {t.returns.inspectOrder}
              </p>
              <p className="rounded-lg bg-blue-50 p-4 text-blue-900 font-inter">
                <strong>{t.returns.unboxingRequired}</strong>
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold text-luxury-navy">{t.returns.nonReturnable}</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                {t.returns.nonReturnableIntro}
              </p>
              <ul className="ml-6 list-disc space-y-2">
                <li>{t.returns.perishable}</li>
                <li>{t.returns.custom}</li>
                <li>{t.returns.personalCare}</li>
                <li>{t.returns.hazardous}</li>
                <li>{t.returns.saleItems}</li>
              </ul>
              <p>
                {t.returns.contactQuestion}
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold text-luxury-navy">{t.returns.refunds}</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                {t.returns.refundProcess}
              </p>
              <p>
                {t.returns.refundTiming}
              </p>
              <p>
                {t.returns.refundContact}
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
