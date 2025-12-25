export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-border/40 bg-luxury-gray-light py-12 md:py-16 lg:py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <h1 className="font-serif text-3xl font-bold md:text-4xl lg:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-muted-foreground md:text-base">
            Last updated: December 25, 2025
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12 md:px-6 md:py-16 lg:px-8 lg:py-20">
        <div className="prose prose-gray mx-auto max-w-4xl">
          {/* Introduction */}
          <section className="mb-12">
            <p className="text-base leading-relaxed text-gray-700 md:text-lg">
              At Mykonos, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or make a purchase from our store.
            </p>
          </section>

          {/* Information We Collect */}
          <section className="mb-12">
            <h2 className="mb-4 font-serif text-2xl font-bold text-gray-900 md:text-3xl">
              1. Information We Collect
            </h2>
            
            <h3 className="mb-3 mt-6 text-xl font-semibold text-gray-900">
              Personal Information
            </h3>
            <p className="mb-4 text-base leading-relaxed text-gray-700">
              When you make a purchase or create an account, we may collect the following information:
            </p>
            <ul className="mb-6 ml-6 list-disc space-y-2 text-base text-gray-700">
              <li>Name and contact information (email address, phone number)</li>
              <li>Billing and shipping addresses</li>
              <li>Payment information (processed securely through our payment providers)</li>
              <li>Order history and preferences</li>
              <li>Account credentials (username and encrypted password)</li>
            </ul>

            <h3 className="mb-3 mt-6 text-xl font-semibold text-gray-900">
              Automatically Collected Information
            </h3>
            <p className="mb-4 text-base leading-relaxed text-gray-700">
              We automatically collect certain information when you visit our website:
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
            <h2 className="mb-4 font-serif text-2xl font-bold text-gray-900 md:text-3xl">
              2. How We Use Your Information
            </h2>
            <p className="mb-4 text-base leading-relaxed text-gray-700">
              We use the information we collect for the following purposes:
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
            <h2 className="mb-4 font-serif text-2xl font-bold text-gray-900 md:text-3xl">
              3. Information Sharing and Disclosure
            </h2>
            <p className="mb-4 text-base leading-relaxed text-gray-700">
              We do not sell, trade, or rent your personal information to third parties. We may share your information with:
            </p>
            <ul className="mb-6 ml-6 list-disc space-y-2 text-base text-gray-700">
              <li><strong>Service Providers:</strong> Third-party companies that help us operate our business (payment processors, shipping companies, email service providers)</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and safety</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            </ul>
          </section>

          {/* Data Security */}
          <section className="mb-12">
            <h2 className="mb-4 font-serif text-2xl font-bold text-gray-900 md:text-3xl">
              4. Data Security
            </h2>
            <p className="mb-4 text-base leading-relaxed text-gray-700">
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:
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
            <h2 className="mb-4 font-serif text-2xl font-bold text-gray-900 md:text-3xl">
              5. Cookies and Tracking Technologies
            </h2>
            <p className="mb-4 text-base leading-relaxed text-gray-700">
              We use cookies and similar tracking technologies to enhance your browsing experience and analyze website traffic. You can control cookie preferences through your browser settings. Note that disabling cookies may affect website functionality.
            </p>
          </section>

          {/* Your Rights */}
          <section className="mb-12">
            <h2 className="mb-4 font-serif text-2xl font-bold text-gray-900 md:text-3xl">
              6. Your Rights and Choices
            </h2>
            <p className="mb-4 text-base leading-relaxed text-gray-700">
              You have the following rights regarding your personal information:
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
            <h2 className="mb-4 font-serif text-2xl font-bold text-gray-900 md:text-3xl">
              7. Children's Privacy
            </h2>
            <p className="text-base leading-relaxed text-gray-700">
              Our website is not intended for children under the age of 13. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
            </p>
          </section>

          {/* International Transfers */}
          <section className="mb-12">
            <h2 className="mb-4 font-serif text-2xl font-bold text-gray-900 md:text-3xl">
              8. International Data Transfers
            </h2>
            <p className="text-base leading-relaxed text-gray-700">
              Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place to protect your information in accordance with this Privacy Policy.
            </p>
          </section>

          {/* Updates */}
          <section className="mb-12">
            <h2 className="mb-4 font-serif text-2xl font-bold text-gray-900 md:text-3xl">
              9. Changes to This Privacy Policy
            </h2>
            <p className="text-base leading-relaxed text-gray-700">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last updated" date. We encourage you to review this Privacy Policy periodically.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-12">
            <h2 className="mb-4 font-serif text-2xl font-bold text-gray-900 md:text-3xl">
              10. Contact Us
            </h2>
            <p className="mb-4 text-base leading-relaxed text-gray-700">
              If you have any questions or concerns about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="rounded-lg bg-luxury-gray-light p-6">
              <p className="mb-2 text-base font-medium text-gray-900">Mykonos Luxury Fragrances</p>
              <p className="text-base text-gray-700">Email: privacy@mykonos.com</p>
              <p className="text-base text-gray-700">Phone: +1 (555) 123-4567</p>
              <p className="text-base text-gray-700">Address: 123 Luxury Avenue, New York, NY 10001</p>
            </div>
          </section>

          {/* Consent */}
          <section className="rounded-lg border-2 border-luxury-gold bg-luxury-gold/5 p-6">
            <p className="text-base font-medium leading-relaxed text-gray-900">
              By using our website and services, you acknowledge that you have read and understood this Privacy Policy and agree to its terms.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
