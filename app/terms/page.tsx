'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'

export default function TermsPage() {
  const { t } = useLanguage()
  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-border/40 bg-luxury-gray-light py-12">
        <div className="container mx-auto px-4 lg:px-8">
          {/* Breadcrumb - Desktop only */}
          <div className="mb-6 hidden md:block">
            <Breadcrumbs 
              items={[
                { label: t.terms?.title || 'Terms & Conditions', href: '/terms' }
              ]} 
            />
          </div>
          <h1 className="font-playfair text-3xl font-bold tracking-[0.05em] text-luxury-navy md:text-4xl lg:text-5xl mb-4">
            {t.terms.title}
          </h1>
          <p className="font-montserrat text-sm text-gray-500 tracking-wide">
            {t.terms.lastUpdated}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 lg:px-8 font-montserrat">
        <div className="mx-auto max-w-4xl space-y-8">
          <section>
            <h2 className="mb-4 font-montserrat text-2xl font-bold text-luxury-navy">{t.terms.generalTerms}</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                {t.terms.generalPara1}
              </p>
              <p>
                {t.terms.generalPara2}
              </p>
              <p>
                {t.terms.generalPara3}
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-montserrat text-2xl font-bold text-luxury-navy">{t.terms.changesModification}</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                {t.terms.changesPara1}
              </p>
              <p>
                {t.terms.changesPara2}
              </p>
              <p>
                {t.terms.changesPara3}
              </p>
              <p>
                {t.terms.changesPara4}
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-montserrat text-2xl font-bold text-luxury-navy">{t.terms.privacyPolicy}</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                {t.terms.privacyPara1}
              </p>
              <p>
                {t.terms.privacyPara2}
              </p>
              <p>
                {t.terms.privacyPara3}
              </p>
              <p>
                {t.terms.privacyPara4}
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-montserrat text-2xl font-bold text-luxury-navy">{t.terms.contentOwnership}</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                {t.terms.contentPara1}
              </p>
              <p>
                {t.terms.contentPara2}
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-montserrat text-2xl font-bold text-luxury-navy">{t.terms.productInfo}</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                {t.terms.productPara1}
              </p>
              <p>
                {t.terms.productPara2}
              </p>
              <p>
                {t.terms.productPara3}
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-montserrat text-2xl font-bold text-luxury-navy">{t.terms.orderingBilling}</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                {t.terms.orderPara1}
              </p>
              <p>
                {t.terms.orderPara2}
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-montserrat text-2xl font-bold text-luxury-navy">{t.terms.thirdParty}</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                {t.terms.thirdPartyPara}
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-montserrat text-2xl font-bold text-luxury-navy">{t.terms.questionsFeedback}</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                {t.terms.feedbackPara}
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-montserrat text-2xl font-bold text-luxury-navy">{t.terms.acceptance}</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                {t.terms.acceptancePara}
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
