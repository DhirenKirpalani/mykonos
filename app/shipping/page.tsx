'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { usePageContent } from '@/hooks/usePageContent'
import { PolicyPageRenderer } from '@/components/PolicyPageRenderer'

export default function ShippingPage() {
  const { t, locale } = useLanguage()
  const { content } = usePageContent('shipping', locale)

  if (content) {
    return <PolicyPageRenderer content={content} breadcrumbHref="/shipping" />
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-border/40 bg-luxury-gray-light py-12">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="mb-6 hidden md:block">
            <Breadcrumbs items={[{ label: t.shipping?.title || 'Shipping Policy', href: '/shipping' }]} />
          </div>
          <h1 className="font-playfair text-3xl font-bold tracking-[0.05em] text-luxury-navy md:text-4xl lg:text-5xl mb-4">{t.shipping.title}</h1>
          <p className="font-montserrat text-sm text-gray-500 tracking-wide">{t.shipping.subtitle}</p>
        </div>
      </div>
      <div className="container mx-auto px-4 py-12 lg:px-8 font-montserrat">
        <div className="mx-auto max-w-4xl space-y-8">
          <section>
            <h2 className="mb-4 font-montserrat text-2xl font-bold text-luxury-navy">{t.shipping.shippingMethod}</h2>
            <div className="space-y-4 text-gray-700">
              <p className="rounded-lg bg-blue-50 p-4 text-blue-900"><strong>{t.shipping.preOrder}</strong></p>
              <p>{t.shipping.preOrderDesc}</p>
            </div>
          </section>
          <section>
            <h2 className="mb-4 font-montserrat text-2xl font-bold text-luxury-navy">{t.shipping.processingNotes}</h2>
            <ol className="ml-6 list-decimal space-y-4 text-gray-700">
              <li>{t.shipping.note1}</li>
              <li>{t.shipping.note2}</li>
              <li>{t.shipping.note3}</li>
            </ol>
          </section>
          <section>
            <h2 className="mb-4 font-montserrat text-2xl font-bold text-luxury-navy">{t.shipping.shippingSchedule}</h2>
            <div className="space-y-6">
              <div>
                <h3 className="mb-3 text-xl font-semibold text-luxury-navy">{t.shipping.domesticOrders}</h3>
                <div className="space-y-3 text-gray-700">
                  <p>{t.shipping.domesticDesc1}</p>
                  <p>{t.shipping.domesticDesc2}</p>
                </div>
              </div>
              <div>
                <h3 className="mb-3 text-xl font-semibold text-luxury-navy">{t.shipping.internationalOrders}</h3>
                <p className="text-gray-700">{t.shipping.internationalDesc}</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
