'use client'

import { useLanguage } from '@/contexts/LanguageContext'

export default function PrivacyPolicyPage() {
  const { t } = useLanguage()
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-border/40 bg-luxury-gray-light py-12 md:py-16 lg:py-20">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <h1 className="font-serif text-3xl font-bold md:text-4xl lg:text-5xl">
            {t.privacy.title}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground md:text-base">
            {t.privacy.lastUpdated}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12 md:px-6 md:py-16 lg:px-8 lg:py-20">
        <div className="prose prose-gray mx-auto max-w-4xl">
          {/* Introduction */}
          <section className="mb-12">
            <p className="text-base leading-relaxed text-gray-700 md:text-lg">
              {t.privacy.intro}
            </p>
          </section>

          {/* Information We Collect */}
          <section className="mb-12">
            <h2 className="mb-4 font-serif text-2xl font-bold text-gray-900 md:text-3xl">
              {t.privacy.infoWeCollect}
            </h2>
            
            <h3 className="mb-3 mt-6 text-xl font-semibold text-gray-900">
              {t.privacy.personalInfo}
            </h3>
            <p className="mb-4 text-base leading-relaxed text-gray-700">
              {t.privacy.personalInfoDesc}
            </p>
            <ul className="mb-6 ml-6 list-disc space-y-2 text-base text-gray-700">
              <li>{t.locale === 'en' ? 'Name and contact information (email address, phone number)' : 'Nama dan informasi kontak (alamat email, nomor telepon)'}</li>
              <li>{t.locale === 'en' ? 'Billing and shipping addresses' : 'Alamat penagihan dan pengiriman'}</li>
              <li>{t.locale === 'en' ? 'Payment information (processed securely through our payment providers)' : 'Informasi pembayaran (diproses dengan aman melalui penyedia pembayaran kami)'}</li>
              <li>{t.locale === 'en' ? 'Order history and preferences' : 'Riwayat pesanan dan preferensi'}</li>
              <li>{t.locale === 'en' ? 'Account credentials (username and encrypted password)' : 'Kredensial akun (nama pengguna dan kata sandi terenkripsi)'}</li>
            </ul>

            <h3 className="mb-3 mt-6 text-xl font-semibold text-gray-900">
              {t.privacy.autoCollected}
            </h3>
            <p className="mb-4 text-base leading-relaxed text-gray-700">
              {t.privacy.autoCollectedDesc}
            </p>
            <ul className="mb-6 ml-6 list-disc space-y-2 text-base text-gray-700">
              <li>{t.locale === 'en' ? 'Browser type and version' : 'Jenis dan versi browser'}</li>
              <li>{t.locale === 'en' ? 'IP address and device information' : 'Alamat IP dan informasi perangkat'}</li>
              <li>{t.locale === 'en' ? 'Pages visited and time spent on our site' : 'Halaman yang dikunjungi dan waktu yang dihabiskan di situs kami'}</li>
              <li>{t.locale === 'en' ? 'Referring website addresses' : 'Alamat situs web rujukan'}</li>
              <li>{t.locale === 'en' ? 'Cookies and similar tracking technologies' : 'Cookie dan teknologi pelacakan serupa'}</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section className="mb-12">
            <h2 className="mb-4 font-serif text-2xl font-bold text-gray-900 md:text-3xl">
              {t.privacy.howWeUse}
            </h2>
            <p className="mb-4 text-base leading-relaxed text-gray-700">
              {t.privacy.howWeUseDesc}
            </p>
            <ul className="mb-6 ml-6 list-disc space-y-2 text-base text-gray-700">
              <li>{t.locale === 'en' ? 'Process and fulfill your orders' : 'Memproses dan memenuhi pesanan Anda'}</li>
              <li>{t.locale === 'en' ? 'Communicate with you about your orders and account' : 'Berkomunikasi dengan Anda tentang pesanan dan akun Anda'}</li>
              <li>{t.locale === 'en' ? 'Send promotional emails and marketing communications (with your consent)' : 'Mengirim email promosi dan komunikasi pemasaran (dengan persetujuan Anda)'}</li>
              <li>{t.locale === 'en' ? 'Improve our website and customer experience' : 'Meningkatkan situs web dan pengalaman pelanggan kami'}</li>
              <li>{t.locale === 'en' ? 'Prevent fraud and enhance security' : 'Mencegah penipuan dan meningkatkan keamanan'}</li>
              <li>{t.locale === 'en' ? 'Comply with legal obligations' : 'Mematuhi kewajiban hukum'}</li>
              <li>{t.locale === 'en' ? 'Analyze website usage and trends' : 'Menganalisis penggunaan dan tren situs web'}</li>
            </ul>
          </section>

          {/* Information Sharing */}
          <section className="mb-12">
            <h2 className="mb-4 font-serif text-2xl font-bold text-gray-900 md:text-3xl">
              {t.privacy.infoSharing}
            </h2>
            <p className="mb-4 text-base leading-relaxed text-gray-700">
              {t.privacy.infoSharingDesc}
            </p>
            <ul className="mb-6 ml-6 list-disc space-y-2 text-base text-gray-700">
              <li><strong>{t.locale === 'en' ? 'Service Providers:' : 'Penyedia Layanan:'}</strong> {t.locale === 'en' ? 'Third-party companies that help us operate our business (payment processors, shipping companies, email service providers)' : 'Perusahaan pihak ketiga yang membantu kami mengoperasikan bisnis kami (pemroses pembayaran, perusahaan pengiriman, penyedia layanan email)'}</li>
              <li><strong>{t.locale === 'en' ? 'Legal Requirements:' : 'Persyaratan Hukum:'}</strong> {t.locale === 'en' ? 'When required by law or to protect our rights and safety' : 'Ketika diwajibkan oleh hukum atau untuk melindungi hak dan keselamatan kami'}</li>
              <li><strong>{t.locale === 'en' ? 'Business Transfers:' : 'Transfer Bisnis:'}</strong> {t.locale === 'en' ? 'In connection with a merger, acquisition, or sale of assets' : 'Sehubungan dengan merger, akuisisi, atau penjualan aset'}</li>
            </ul>
          </section>

          {/* Data Security */}
          <section className="mb-12">
            <h2 className="mb-4 font-serif text-2xl font-bold text-gray-900 md:text-3xl">
              {t.privacy.dataSecurity}
            </h2>
            <p className="mb-4 text-base leading-relaxed text-gray-700">
              {t.privacy.dataSecurityDesc}
            </p>
            <ul className="mb-6 ml-6 list-disc space-y-2 text-base text-gray-700">
              <li>{t.locale === 'en' ? 'SSL encryption for data transmission' : 'Enkripsi SSL untuk transmisi data'}</li>
              <li>{t.locale === 'en' ? 'Secure payment processing through trusted providers' : 'Pemrosesan pembayaran yang aman melalui penyedia terpercaya'}</li>
              <li>{t.locale === 'en' ? 'Regular security assessments and updates' : 'Penilaian dan pembaruan keamanan secara berkala'}</li>
              <li>{t.locale === 'en' ? 'Limited access to personal information by authorized personnel only' : 'Akses terbatas ke informasi pribadi hanya oleh personel yang berwenang'}</li>
              <li>{t.locale === 'en' ? 'Password protection and authentication requirements' : 'Perlindungan kata sandi dan persyaratan autentikasi'}</li>
            </ul>
          </section>

          {/* Cookies */}
          <section className="mb-12">
            <h2 className="mb-4 font-serif text-2xl font-bold text-gray-900 md:text-3xl">
              {t.privacy.cookies}
            </h2>
            <p className="mb-4 text-base leading-relaxed text-gray-700">
              {t.privacy.cookiesDesc}
            </p>
          </section>

          {/* Your Rights */}
          <section className="mb-12">
            <h2 className="mb-4 font-serif text-2xl font-bold text-gray-900 md:text-3xl">
              {t.privacy.yourRights}
            </h2>
            <p className="mb-4 text-base leading-relaxed text-gray-700">
              {t.privacy.yourRightsDesc}
            </p>
            <ul className="mb-6 ml-6 list-disc space-y-2 text-base text-gray-700">
              <li><strong>{t.locale === 'en' ? 'Access:' : 'Akses:'}</strong> {t.locale === 'en' ? 'Request a copy of the personal information we hold about you' : 'Minta salinan informasi pribadi yang kami miliki tentang Anda'}</li>
              <li><strong>{t.locale === 'en' ? 'Correction:' : 'Koreksi:'}</strong> {t.locale === 'en' ? 'Request correction of inaccurate or incomplete information' : 'Minta koreksi informasi yang tidak akurat atau tidak lengkap'}</li>
              <li><strong>{t.locale === 'en' ? 'Deletion:' : 'Penghapusan:'}</strong> {t.locale === 'en' ? 'Request deletion of your personal information' : 'Minta penghapusan informasi pribadi Anda'}</li>
              <li><strong>{t.locale === 'en' ? 'Opt-out:' : 'Berhenti Berlangganan:'}</strong> {t.locale === 'en' ? 'Unsubscribe from marketing communications at any time' : 'Berhenti berlangganan komunikasi pemasaran kapan saja'}</li>
              <li><strong>{t.locale === 'en' ? 'Data Portability:' : 'Portabilitas Data:'}</strong> {t.locale === 'en' ? 'Request transfer of your data to another service' : 'Minta transfer data Anda ke layanan lain'}</li>
            </ul>
            <p className="text-base leading-relaxed text-gray-700">
              {t.locale === 'en' ? 'To exercise these rights, please contact us at privacy@mykonos.com' : 'Untuk menggunakan hak-hak ini, silakan hubungi kami di privacy@mykonos.com'}
            </p>
          </section>

          {/* Children's Privacy */}
          <section className="mb-12">
            <h2 className="mb-4 font-serif text-2xl font-bold text-gray-900 md:text-3xl">
              {t.privacy.childrenPrivacy}
            </h2>
            <p className="text-base leading-relaxed text-gray-700">
              {t.privacy.childrenDesc}
            </p>
          </section>

          {/* International Transfers */}
          <section className="mb-12">
            <h2 className="mb-4 font-serif text-2xl font-bold text-gray-900 md:text-3xl">
              {t.privacy.intlTransfers}
            </h2>
            <p className="text-base leading-relaxed text-gray-700">
              {t.privacy.intlTransfersDesc}
            </p>
          </section>

          {/* Updates */}
          <section className="mb-12">
            <h2 className="mb-4 font-serif text-2xl font-bold text-gray-900 md:text-3xl">
              {t.privacy.changes}
            </h2>
            <p className="text-base leading-relaxed text-gray-700">
              {t.privacy.changesDesc}
            </p>
          </section>

          {/* Contact */}
          <section className="mb-12">
            <h2 className="mb-4 font-serif text-2xl font-bold text-gray-900 md:text-3xl">
              {t.privacy.contactUs}
            </h2>
            <p className="mb-4 text-base leading-relaxed text-gray-700">
              {t.privacy.contactDesc}
            </p>
            <div className="rounded-lg bg-luxury-gray-light p-6">
              <p className="mb-2 text-base font-medium text-gray-900">Mykonos Luxury Fragrances</p>
              <p className="text-base text-gray-700">{t.locale === 'en' ? 'Email' : 'Email'}: privacy@mykonos.com</p>
              <p className="text-base text-gray-700">{t.locale === 'en' ? 'Phone' : 'Telepon'}: +62 857-8021-8514</p>
              <p className="text-base text-gray-700">{t.locale === 'en' ? 'Address' : 'Alamat'}: Jakarta, Indonesia</p>
            </div>
          </section>

          {/* Consent */}
          <section className="rounded-lg border-2 border-luxury-gold bg-luxury-gold/5 p-6">
            <p className="text-base font-medium leading-relaxed text-gray-900">
              {t.privacy.consent}
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
