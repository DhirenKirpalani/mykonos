'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'

export default function PrivacyPolicyPage() {
  const { t } = useLanguage()
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-border/40 bg-luxury-gray-light py-12 md:py-16 lg:py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          {/* Breadcrumb - Desktop only */}
          <div className="mb-6 hidden md:block">
            <Breadcrumbs 
              items={[
                { label: t.privacy?.title || 'Privacy Policy', href: '/privacy' }
              ]} 
            />
          </div>
          <h1 className="font-playfair text-3xl font-bold tracking-[0.05em] text-luxury-navy md:text-4xl lg:text-5xl">
            {t.privacy.title}
          </h1>
          <p className="mt-3 font-montserrat text-sm text-gray-500 tracking-wide">
            {t.privacy.lastUpdated}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12 md:px-6 md:py-16 lg:px-8 lg:py-20 font-montserrat">
        <div className="prose prose-gray mx-auto max-w-4xl">
          {/* Introduction */}
          <section className="mb-12">
            <p className="text-base leading-relaxed text-gray-700 md:text-lg">
              {t.privacy.intro}
            </p>
          </section>

          {/* Information We Collect */}
          <section className="mb-12">
            <h2 className="mb-4 font-playfair text-2xl font-bold text-gray-900 md:text-3xl">
              {t.privacy.infoWeCollect}
            </h2>
            
            <h3 className="mb-3 mt-6 text-2xl font-bold" style={{ color: '#071D49' }}>
              {t.privacy.personalInfo}
            </h3>
            <p className="mb-4 text-base leading-relaxed text-gray-700">
              {t.privacy.personalInfoDesc}
            </p>
            <ul className="mb-6 ml-6 list-disc space-y-2 text-base text-gray-700">
              <li>Name and contact information (email address, phone number)</li>
              <li>Billing and shipping addresses</li>
              <li>Payment information (processed securely through our payment providers)</li>
              <li>Order history and preferences</li>
              <li>Account credentials (username and encrypted password)</li>
            </ul>

            <h3 className="mb-3 mt-6 text-2xl font-bold" style={{ color: '#071D49' }}>
              {t.privacy.autoCollected}
            </h3>
            <p className="mb-4 text-base leading-relaxed text-gray-700">
              {t.privacy.autoCollectedDesc}
            </p>
            <ul className="mb-6 ml-6 list-disc space-y-2 text-base text-gray-700">
              <li>Browser type and version</li>
              <li>IP address and device information</li>
              <li>Pages visited and time spent on our site</li>
              <li>Referring website addresses</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section className="mb-12">
            <h2 className="mb-4 font-playfair text-2xl font-bold text-gray-900 md:text-3xl">
              {t.privacy.howWeUse}
            </h2>
            <p className="mb-4 text-base leading-relaxed text-gray-700">
              {t.privacy.howWeUseDesc}
            </p>
            <ul className="mb-6 ml-6 list-disc space-y-2 text-base text-gray-700">
              <li>Process and fulfill your orders</li>
              <li>Communicate with you about your orders and account</li>
              <li>Send promotional emails and marketing communications (with your consent)</li>
              <li>Improve our website and customer experience</li>
              <li>Prevent fraud and enhance security</li>
              <li>Comply with legal obligations</li>
              <li>Analyze website usage and trends</li>
            </ul>
          </section>

          {/* Information Sharing */}
          <section className="mb-12">
            <h2 className="mb-4 font-playfair text-2xl font-bold text-gray-900 md:text-3xl">
              {t.privacy.infoSharing}
            </h2>
            <p className="mb-4 text-base leading-relaxed text-gray-700">
              {t.privacy.infoSharingDesc}
            </p>
            <ul className="mb-6 ml-6 list-disc space-y-2 text-base text-gray-700">
              <li><strong>Service Providers:</strong> Third-party companies that help us operate our business (payment processors, shipping companies, email service providers)</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and safety</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            </ul>
          </section>

          {/* Data Security */}
          <section className="mb-12">
            <h2 className="mb-4 font-playfair text-2xl font-bold text-gray-900 md:text-3xl">
              {t.privacy.dataSecurity}
            </h2>
            <p className="mb-4 text-base leading-relaxed text-gray-700">
              {t.privacy.dataSecurityDesc}
            </p>
            <ul className="mb-6 ml-6 list-disc space-y-2 text-base text-gray-700">
              <li>SSL encryption for data transmission</li>
              <li>Secure payment processing through trusted providers</li>
              <li>Regular security assessments and updates</li>
              <li>Limited access to personal information by authorized personnel only</li>
              <li>Password protection and authentication requirements</li>
            </ul>
          </section>

          {/* Cookies */}
          <section className="mb-12">
            <h2 className="mb-4 font-playfair text-2xl font-bold text-gray-900 md:text-3xl">
              {t.privacy.cookies}
            </h2>
            <p className="mb-4 text-base leading-relaxed text-gray-700">
              {t.privacy.cookiesDesc}
            </p>
          </section>

          {/* Your Rights */}
          <section className="mb-12">
            <h2 className="mb-4 font-playfair text-2xl font-bold text-gray-900 md:text-3xl">
              {t.privacy.yourRights}
            </h2>
            <p className="mb-4 text-base leading-relaxed text-gray-700">
              {t.privacy.yourRightsDesc}
            </p>
            <ul className="mb-6 ml-6 list-disc space-y-2 text-base text-gray-700">
              <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal information</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing communications at any time</li>
              <li><strong>Data Portability:</strong> Request transfer of your data to another service</li>
            </ul>
            <p className="text-base leading-relaxed text-gray-700">
              To exercise these rights, please contact us at privacy@mykonos.com
            </p>
          </section>

          {/* Children's Privacy */}
          <section className="mb-12">
            <h2 className="mb-4 font-playfair text-2xl font-bold text-gray-900 md:text-3xl">
              {t.privacy.childrenPrivacy}
            </h2>
            <p className="text-base leading-relaxed text-gray-700">
              {t.privacy.childrenDesc}
            </p>
          </section>

          {/* International Transfers */}
          <section className="mb-12">
            <h2 className="mb-4 font-playfair text-2xl font-bold text-gray-900 md:text-3xl">
              {t.privacy.intlTransfers}
            </h2>
            <p className="text-base leading-relaxed text-gray-700">
              {t.privacy.intlTransfersDesc}
            </p>
          </section>

          {/* Updates */}
          <section className="mb-12">
            <h2 className="mb-4 font-playfair text-2xl font-bold text-gray-900 md:text-3xl">
              {t.privacy.changes}
            </h2>
            <p className="text-base leading-relaxed text-gray-700">
              {t.privacy.changesDesc}
            </p>
          </section>

          {/* Contact */}
          <section className="mb-12">
            <h2 className="mb-4 font-playfair text-2xl font-bold text-gray-900 md:text-3xl">
              {t.privacy.contactUs}
            </h2>
            <div className="space-y-4 text-gray-700">
              <div className="rounded-lg bg-blue-50 p-4 text-blue-900">
                <p className="mb-2"><strong>MYKONOS Luxury Fragrances</strong></p>
                <p>Email: privacy@mykonos.com</p>
                <p>Phone: +62 816-261-783</p>
                <p>Address: Jakarta, Indonesia</p>
              </div>
            </div>
          </section>

          {/* Consent */}
          <section className="rounded-lg bg-luxury-gold p-6">
            <p className="text-base font-montserrat font-semibold leading-relaxed text-luxury-navy">
              {t.privacy.consent}
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
