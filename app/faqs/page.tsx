'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'

const faqsData = {
  en: [
    {
      category: 'Ordering',
      questions: [
        {
          q: 'HOW TO ORDER?',
          a: '1. Browse and Select Products - From the home page, click on a category to browse our fragrances. Click the picture of the fragrance you are interested in for their complete description and detailed pictures.\n\n2. Add to Cart and Review Order - Choose your desired size and quantity, and proceed to click the "Add to cart" button. Click the bag icon on the top right of your screen to review your order before payment. However, for an immediate redirection to payment, click the "Buy it now" button after choosing your desired size and quantity.\n\n3. Sign In - For registered shoppers, kindly fill in your registered details and sign in to your account. For unregistered shoppers, kindly fill your details accordingly or create an account for faster checkouts on your next purchase. Please note that the availability of your desired product is not guaranteed before you checkout.\n\n4. Checkout - Choose your desired payment and shipping method, and review and double check your order before payment. If you are ready to finalize your order, click "Pay now".\n\n5. Confirm Payment - Confirm your payment (if you choose the "Bank Transfer" payment method).\n\n6. Finish Shopping - Once done, you can sit back and wait patiently for your order to arrive. Check your order status on the "Orders" page or your registered email.',
        },
        {
          q: 'HOW TO CHECK MY ORDER STATUS?',
          a: 'You can check your order status on the "Orders" page in your account or through the confirmation email sent to your registered email address.',
        },
        {
          q: 'CAN I EDIT MY ORDER?',
          a: 'Once an order has been placed and payment confirmed, we cannot guarantee changes. Please contact us immediately at +62 857-8021-8514 if you need to modify your order.',
        },
      ],
    },
    {
      category: 'Shipping & Delivery',
      questions: [
        {
          q: 'WHY IS MY DELIVERY STATUS PENDING OR DELAYED?',
          a: 'Delivery delays can occur due to courier services, weather conditions, or high order volumes. We work closely with trusted courier partners, but once your package has been handed over to the courier, Mykonos is not responsible for delays. Please contact us at +62 857-8021-8514 for assistance.',
        },
        {
          q: 'DO YOU SHIP WORLDWIDE?',
          a: 'Yes, we offer international shipping. Domestic orders (Indonesia) take 3-5 working days, while international orders take 5-15 working days depending on the destination and customs processing.',
        },
      ],
    },
    {
      category: 'Returns & Issues',
      questions: [
        {
          q: 'I RECEIVED DAMAGED OR WRONG ITEM.',
          a: 'Upon receiving your order, please inspect the items and record an unboxing video. If you find any defects, damage, or receive the wrong item, contact us right away at +62 857-8021-8514. Please note that an unboxing video is required to claim a return or refund.',
        },
        {
          q: 'I ORDERED THE WRONG ITEM.',
          a: 'We have a 3-day return policy. Contact us at +62 857-8021-8514 to request a return. If accepted, we will send you a return shipping label and instructions. For the quickest exchange, return the item and place a new order for the correct item.',
        },
      ],
    },
    {
      category: 'Store & Products',
      questions: [
        {
          q: 'DO YOU HAVE OFFLINE STORE?',
          a: 'Currently, Mykonos operates exclusively online to provide you with the best prices and widest selection. All orders are processed through our website.',
        },
        {
          q: 'WILL THERE BE RESTOCKS FOR THE SOLD OUT ITEMS?',
          a: 'We regularly restock popular items. Please contact us at +62 857-8021-8514 or follow our social media for restock announcements.',
        },
      ],
    },
  ],
  id: [
    {
      category: 'Pemesanan',
      questions: [
        {
          q: 'BAGAIMANA CARA MEMESAN?',
          a: '1. Jelajahi dan Pilih Produk - Dari halaman beranda, klik kategori untuk menjelajahi parfum kami. Klik gambar parfum yang Anda minati untuk deskripsi lengkap dan gambar detail.\n\n2. Tambahkan ke Keranjang dan Tinjau Pesanan - Pilih ukuran dan jumlah yang Anda inginkan, lalu klik tombol "Tambahkan ke keranjang". Klik ikon tas di kanan atas layar Anda untuk meninjau pesanan sebelum pembayaran. Namun, untuk pengalihan langsung ke pembayaran, klik tombol "Beli sekarang" setelah memilih ukuran dan jumlah yang diinginkan.\n\n3. Masuk - Untuk pembeli terdaftar, silakan isi detail terdaftar Anda dan masuk ke akun Anda. Untuk pembeli yang belum terdaftar, silakan isi detail Anda atau buat akun untuk checkout lebih cepat pada pembelian berikutnya. Harap dicatat bahwa ketersediaan produk yang Anda inginkan tidak dijamin sebelum Anda checkout.\n\n4. Checkout - Pilih metode pembayaran dan pengiriman yang Anda inginkan, dan tinjau serta periksa kembali pesanan Anda sebelum pembayaran. Jika Anda siap untuk menyelesaikan pesanan, klik "Bayar sekarang".\n\n5. Konfirmasi Pembayaran - Konfirmasi pembayaran Anda (jika Anda memilih metode pembayaran "Transfer Bank").\n\n6. Selesai Berbelanja - Setelah selesai, Anda dapat duduk santai dan menunggu pesanan Anda tiba. Periksa status pesanan Anda di halaman "Pesanan" atau email terdaftar Anda.',
        },
        {
          q: 'BAGAIMANA CARA MEMERIKSA STATUS PESANAN SAYA?',
          a: 'Anda dapat memeriksa status pesanan Anda di halaman "Pesanan" di akun Anda atau melalui email konfirmasi yang dikirim ke alamat email terdaftar Anda.',
        },
        {
          q: 'BISAKAH SAYA MENGEDIT PESANAN SAYA?',
          a: 'Setelah pesanan dilakukan dan pembayaran dikonfirmasi, kami tidak dapat menjamin perubahan. Silakan hubungi kami segera di +62 857-8021-8514 jika Anda perlu mengubah pesanan Anda.',
        },
      ],
    },
    {
      category: 'Pengiriman & Pengantaran',
      questions: [
        {
          q: 'MENGAPA STATUS PENGIRIMAN SAYA TERTUNDA ATAU TERLAMBAT?',
          a: 'Keterlambatan pengiriman dapat terjadi karena layanan kurir, kondisi cuaca, atau volume pesanan yang tinggi. Kami bekerja sama dengan mitra kurir terpercaya, tetapi setelah paket Anda diserahkan ke kurir, Mykonos tidak bertanggung jawab atas keterlambatan. Silakan hubungi kami di +62 857-8021-8514 untuk bantuan.',
        },
        {
          q: 'APAKAH ANDA MENGIRIM KE SELURUH DUNIA?',
          a: 'Ya, kami menawarkan pengiriman internasional. Pesanan domestik (Indonesia) memakan waktu 3-5 hari kerja, sementara pesanan internasional memakan waktu 5-15 hari kerja tergantung pada tujuan dan pemrosesan bea cukai.',
        },
      ],
    },
    {
      category: 'Pengembalian & Masalah',
      questions: [
        {
          q: 'SAYA MENERIMA BARANG YANG RUSAK ATAU SALAH.',
          a: 'Setelah menerima pesanan Anda, harap periksa barang dan rekam video unboxing. Jika Anda menemukan cacat, kerusakan, atau menerima barang yang salah, hubungi kami segera di +62 857-8021-8514. Harap dicatat bahwa video unboxing diperlukan untuk mengklaim pengembalian atau pengembalian dana.',
        },
        {
          q: 'SAYA MEMESAN BARANG YANG SALAH.',
          a: 'Kami memiliki kebijakan pengembalian 3 hari. Hubungi kami di +62 857-8021-8514 untuk meminta pengembalian. Jika diterima, kami akan mengirimkan label pengiriman pengembalian dan instruksi. Untuk penukaran tercepat, kembalikan barang dan lakukan pemesanan baru untuk barang yang benar.',
        },
      ],
    },
    {
      category: 'Toko & Produk',
      questions: [
        {
          q: 'APAKAH ANDA MEMILIKI TOKO OFFLINE?',
          a: 'Saat ini, Mykonos beroperasi secara eksklusif online untuk memberikan Anda harga terbaik dan pilihan terluas. Semua pesanan diproses melalui situs web kami.',
        },
        {
          q: 'APAKAH AKAN ADA RESTOCK UNTUK BARANG YANG HABIS?',
          a: 'Kami secara teratur melakukan restock barang populer. Silakan hubungi kami di +62 857-8021-8514 atau ikuti media sosial kami untuk pengumuman restock.',
        },
      ],
    },
  ],
}

export default function FAQsPage() {
  const { t, locale } = useLanguage()
  const [openItems, setOpenItems] = useState<string[]>([])
  
  const faqs = faqsData[locale as keyof typeof faqsData] || faqsData.en

  const toggleItem = (id: string) => {
    setOpenItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-border/40 bg-luxury-gray-light py-12">
        <div className="container mx-auto px-4 lg:px-8">
          {/* Breadcrumb - Desktop only */}
          <div className="mb-6 hidden md:block">
            <Breadcrumbs 
              items={[
                { label: t.footer?.helpCenter || 'Help Center', href: '/faqs' }
              ]} 
            />
          </div>
          <h1 className="mb-4 font-montserrat text-4xl font-bold lg:text-5xl">
            {t.faqs.title}
          </h1>
          <p className="font-playfair text-lg text-muted-foreground">
            {t.faqs.subtitle}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 lg:px-8 font-montserrat">
        <div className="mx-auto max-w-4xl">
          {faqs.map((category, categoryIndex) => (
            <div key={categoryIndex} className="mb-12">
              <h2 className="mb-6 font-playfair text-2xl font-bold">
                {category.category}
              </h2>
              <div className="space-y-4">
                {category.questions.map((faq, faqIndex) => {
                  const id = `${categoryIndex}-${faqIndex}`
                  const isOpen = openItems.includes(id)
                  return (
                    <div
                      key={id}
                      className="rounded-lg border border-border/40 bg-white"
                    >
                      <button
                        onClick={() => toggleItem(id)}
                        className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-luxury-gray-light"
                      >
                        <span className="font-medium">{faq.q}</span>
                        <ChevronDown
                          className={`h-5 w-5 transition-transform ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className="border-t border-border/40 p-6">
                          <div className="prose prose-sm max-w-none text-muted-foreground">
                            {faq.a.split('\n\n').map((paragraph, idx) => (
                              <p key={idx} className="mb-3 last:mb-0 leading-relaxed">
                                {paragraph}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          <div className="mt-12 rounded-lg bg-luxury-navy p-8 text-center text-white">
            <h3 className="mb-4 font-montserrat text-2xl font-bold">
              {t.faqs.couldntFind}
            </h3>
            <p className="mb-6 font-playfair text-gray-300">
              {t.faqs.helpText}
            </p>
            <a
              href="/contact"
              className="inline-block rounded-md bg-luxury-gold px-8 py-3 font-montserrat font-semibold uppercase tracking-wider text-luxury-navy transition-all hover:bg-luxury-gold-light"
            >
              {t.faqs.contactUs}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
