'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'

export default function ShippingPage() {
  const { t } = useLanguage()
  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-border/40 bg-luxury-gray-light py-12">
        <div className="container mx-auto px-4 lg:px-8">
          {/* Breadcrumb - Desktop only */}
          <div className="mb-6 hidden md:block">
            <Breadcrumbs 
              items={[
                { label: t.shipping?.title || 'Shipping Policy', href: '/shipping' }
              ]} 
            />
          </div>
          <h1 className="mb-4 font-montserrat text-4xl font-bold lg:text-5xl">
            {t.shipping.title}
          </h1>
          <p className="font-playfair text-lg text-muted-foreground">
            {t.shipping.subtitle}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 lg:px-8 font-montserrat">
        <div className="mx-auto max-w-4xl space-y-8">
          <section>
            <h2 className="mb-4 font-montserrat text-2xl font-bold text-luxury-navy">{t.shipping.shippingMethod}</h2>
            <div className="space-y-4 text-gray-700">
              <p className="rounded-lg bg-blue-50 p-4 text-blue-900">
                <strong>{t.shipping.preOrder}</strong>
              </p>
              <p>
                {t.shipping.preOrderDesc}
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-montserrat text-2xl font-bold text-luxury-navy">{t.shipping.processingNotes}</h2>
            <div className="space-y-4 text-gray-700">
              <ol className="ml-6 list-decimal space-y-4">
                <li>
                  {t.shipping.note1}
                </li>
                <li>
                  {t.shipping.note2}
                </li>
                <li>
                  {t.shipping.note3}
                </li>
              </ol>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-montserrat text-2xl font-bold text-luxury-navy">{t.shipping.shippingSchedule}</h2>
            <div className="space-y-6">
              <div>
                <h3 className="mb-3 text-xl font-semibold text-luxury-navy">{t.shipping.domesticOrders}</h3>
                <div className="space-y-3 text-gray-700">
                  <p>
                    {t.shipping.domesticDesc1}
                  </p>
                  <p>
                    {t.shipping.domesticDesc2}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-xl font-semibold text-luxury-navy">{t.shipping.internationalOrders}</h3>
                <div className="space-y-3 text-gray-700">
                  <p>
                    {t.shipping.internationalDesc}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
