-- Page contents table for CMS-configurable copywriting
CREATE TABLE IF NOT EXISTS page_contents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_key TEXT NOT NULL,        -- e.g. 'about', 'shipping', 'returns', 'terms', 'privacy', 'faqs'
  locale TEXT NOT NULL DEFAULT 'en', -- 'en' or 'id'
  content JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES users(id),
  UNIQUE(page_key, locale)
);

-- RLS
ALTER TABLE page_contents ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "page_contents_public_read" ON page_contents
  FOR SELECT USING (true);

-- Admin write
CREATE POLICY "page_contents_admin_write" ON page_contents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

-- Seed default EN content for About Us
INSERT INTO page_contents (page_key, locale, content) VALUES
('about', 'en', '{
  "hero_desktop_image": "/assets/images/web about us banner.png",
  "hero_mobile_image": "/assets/images/mobile about us banner.png",
  "sections": [
    {
      "number": "01",
      "title": "The Art of Perfumery",
      "paragraphs": [
        "At MYKONOS, we believe that fragrance is more than a scent—it is an invisible signature, a silent statement that lingers in the memory long after you have left the room.",
        "Born from a passion for artisanal craftsmanship and a deep appreciation for the olfactive arts, MYKONOS was founded with a singular vision: to bring world-class fragrances to those who dare to express their individuality."
      ]
    },
    {
      "number": "02",
      "title": "Craftsmanship & Global Recognition",
      "paragraphs": [
        "Each MYKONOS fragrance is meticulously crafted using the finest raw materials sourced from across the globe. Our master perfumers blend tradition with innovation, creating scents that are both timeless and contemporary.",
        "From the sun-drenched lavender fields of Provence to the exotic spice markets of the Middle East, every ingredient is chosen for its exceptional quality and unique olfactive profile."
      ]
    },
    {
      "number": "03",
      "title": "Sustainability & Purpose",
      "paragraphs": [
        "We are committed to responsible luxury. Our packaging is designed with sustainability in mind—using recycled materials, minimizing waste, and partnering with suppliers who share our values. We believe that true luxury should not come at the cost of our planet. At MYKONOS, we",
        "Our journey is one of continuous discovery. We are constantly exploring new ingredients, new techniques, and new stories to tell through the language of scent. Because for us, perfumery is not just a craft—it is a calling."
      ]
    }
  ],
  "cta_title": "Designed to be Remembered",
  "cta_subtitle": "Enter the world of MYKONOS fragrances",
  "cta_button": "Shop Now"
}')
ON CONFLICT (page_key, locale) DO NOTHING;

-- Seed default ID content for About Us
INSERT INTO page_contents (page_key, locale, content) VALUES
('about', 'id', '{
  "hero_desktop_image": "/assets/images/web about us banner.png",
  "hero_mobile_image": "/assets/images/mobile about us banner.png",
  "sections": [
    {
      "number": "01",
      "title": "Seni Parfum",
      "paragraphs": [
        "Di MYKONOS, kami percaya bahwa wewangian lebih dari sekadar aroma—ia adalah tanda tangan tak terlihat, pernyataan diam yang bertahan dalam ingatan lama setelah Anda meninggalkan ruangan.",
        "Lahir dari kecintaan terhadap kerajinan artisanal dan apresiasi mendalam terhadap seni olfaktif, MYKONOS didirikan dengan satu visi tunggal: menghadirkan wewangian berkelas dunia bagi mereka yang berani mengekspresikan individualitas mereka."
      ]
    },
    {
      "number": "02",
      "title": "Keahlian & Pengakuan Global",
      "paragraphs": [
        "Setiap wewangian MYKONOS dibuat dengan teliti menggunakan bahan-bahan terbaik yang bersumber dari seluruh penjuru dunia. Parfumer master kami memadukan tradisi dengan inovasi, menciptakan aroma yang abadi sekaligus kontemporer.",
        "Dari ladang lavender di bawah sinar matahari Provence hingga pasar rempah-rempah eksotis di Timur Tengah, setiap bahan dipilih karena kualitasnya yang luar biasa dan profil olfaktif yang unik."
      ]
    },
    {
      "number": "03",
      "title": "Keberlanjutan & Tujuan",
      "paragraphs": [
        "Kami berkomitmen pada kemewahan yang bertanggung jawab. Kemasan kami dirancang dengan mempertimbangkan keberlanjutan—menggunakan bahan daur ulang, meminimalkan limbah, dan bermitra dengan pemasok yang berbagi nilai-nilai kami. Kami percaya kemewahan sejati tidak boleh mengorbankan planet kita. Di MYKONOS, kami",
        "Perjalanan kami adalah penemuan yang berkelanjutan. Kami terus mengeksplorasi bahan-bahan baru, teknik-teknik baru, dan kisah-kisah baru untuk diceritakan melalui bahasa aroma. Karena bagi kami, parfum bukan sekadar kerajinan—ini adalah panggilan jiwa."
      ]
    }
  ],
  "cta_title": "Dirancang untuk Diingat",
  "cta_subtitle": "Masuki dunia wewangian MYKONOS",
  "cta_button": "Belanja Sekarang"
}')
ON CONFLICT (page_key, locale) DO NOTHING;

-- Seed default EN Shipping Policy
INSERT INTO page_contents (page_key, locale, content) VALUES
('shipping', 'en', '{
  "title": "Shipping Policy",
  "subtitle": "Last updated: January 2024",
  "sections": [
    {
      "title": "Shipping Method",
      "type": "paragraphs",
      "highlight": "Pre-Order Notice: All MYKONOS products are made-to-order. Please allow 3-5 business days for production before your order is shipped.",
      "content": ["We partner with trusted courier services to ensure your fragrance arrives safely and promptly. Shipping costs are calculated at checkout based on your location and order weight."]
    },
    {
      "title": "Processing Notes",
      "type": "numbered_list",
      "content": [
        "Orders are processed within 3-5 business days after payment confirmation.",
        "You will receive a tracking number via email once your order has been shipped.",
        "MYKONOS is not responsible for delays caused by courier services, customs, or weather conditions."
      ]
    },
    {
      "title": "Shipping Schedule",
      "type": "subsections",
      "subsections": [
        {
          "title": "Domestic Orders (Indonesia)",
          "content": ["Estimated delivery: 3-5 working days after dispatch.", "We ship to all regions in Indonesia via our trusted courier partners."]
        },
        {
          "title": "International Orders",
          "content": ["Estimated delivery: 5-15 working days after dispatch, depending on destination and customs processing."]
        }
      ]
    }
  ]
}')
ON CONFLICT (page_key, locale) DO NOTHING;

-- Seed default EN Returns/Refund Policy
INSERT INTO page_contents (page_key, locale, content) VALUES
('returns', 'en', '{
  "title": "Refund Policy",
  "subtitle": "Last updated: January 2024",
  "sections": [
    {
      "title": "Returns & Exchanges",
      "type": "paragraphs",
      "content": [
        "We have a 3-day return policy, which means you have 3 days after receiving your item to request a return.",
        "To be eligible for a return, please contact us at +62 816-261-783. If your return is accepted, we will send you a return shipping label, as well as instructions on how and where to send your package.",
        "For the quickest exchange, return the item you have and once the return is accepted, make a separate purchase for the new item."
      ]
    },
    {
      "title": "Damages & Issues",
      "type": "paragraphs",
      "highlight": "Important: An unboxing video is required to claim any return or refund for damaged or wrong items.",
      "content": ["Please inspect your order upon reception and contact us immediately if the item is defective, damaged or if you receive the wrong item, so that we can evaluate the issue and make it right."]
    },
    {
      "title": "Non-Returnable Items",
      "type": "list",
      "intro": "Certain types of items cannot be returned, including:",
      "content": [
        "Perishable goods (such as food, flowers, or plants)",
        "Custom products (such as special orders or personalized items)",
        "Personal care goods (such as beauty products)",
        "Hazardous materials, flammable liquids, or gases",
        "Sale items or gift cards"
      ],
      "footer": "Please get in touch if you have questions or concerns about your specific item."
    },
    {
      "title": "Refunds",
      "type": "paragraphs",
      "content": [
        "We will notify you once we have received and inspected your return, and let you know if the refund was approved or not.",
        "If approved, you will be automatically refunded on your original payment method within 10 business days.",
        "Please remember it can take some time for your bank or credit card company to process and post the refund. If more than 15 business days have passed since we approved your return, please contact us at +62 816-261-783."
      ]
    }
  ]
}')
ON CONFLICT (page_key, locale) DO NOTHING;

-- Seed default EN Terms of Service
INSERT INTO page_contents (page_key, locale, content) VALUES
('terms', 'en', '{
  "title": "Terms & Conditions",
  "subtitle": "Last updated: January 2024",
  "sections": [
    {
      "title": "General Terms",
      "type": "paragraphs",
      "content": [
        "By accessing and placing an order with MYKONOS, you confirm that you are in agreement with and bound by the terms of service contained in the Terms & Conditions outlined below.",
        "These terms apply to the entire website and any email or other type of communication between you and MYKONOS.",
        "Under no circumstances shall MYKONOS team be liable for any direct, indirect, special, incidental or consequential damages, including, but not limited to, loss of data or profit, arising out of the use, or the inability to use, the materials on this site."
      ]
    },
    {
      "title": "Changes & Modification",
      "type": "paragraphs",
      "content": [
        "MYKONOS reserves the right to modify these terms from time to time at our sole discretion.",
        "The most current version of the Terms will supersede all previous versions.",
        "MYKONOS encourages you to periodically review the Terms to stay informed of our updates.",
        "By using this site you are agreeing to these Terms and Conditions."
      ]
    },
    {
      "title": "Privacy Policy",
      "type": "paragraphs",
      "content": [
        "Before or at the time of collecting personal information, we will identify the purposes for which information is being collected.",
        "We will collect and use personal information solely with the objective of fulfilling those purposes specified by us and for other compatible purposes, unless we obtain the consent of the individual concerned or as required by law.",
        "We will only retain personal information as long as necessary for the fulfillment of those purposes.",
        "We will protect personal information by reasonable security safeguards against loss or theft, as well as unauthorized access, disclosure, copying, use or modification."
      ]
    },
    {
      "title": "Content & Ownership",
      "type": "paragraphs",
      "content": [
        "All content on this website, including but not limited to text, graphics, logos, images, and software, is the property of MYKONOS and is protected by applicable intellectual property laws.",
        "You may not reproduce, distribute, or create derivative works from any content on this website without our express written permission."
      ]
    },
    {
      "title": "Product Information",
      "type": "paragraphs",
      "content": [
        "We strive to display as accurately as possible the colors and images of our products. We cannot guarantee that your computer monitor display of any color will be accurate.",
        "We reserve the right, but are not obligated, to limit the sales of our products or Services to any person, geographic region or jurisdiction.",
        "We reserve the right to limit the quantities of any products or services that we offer."
      ]
    },
    {
      "title": "Ordering & Billing",
      "type": "paragraphs",
      "content": [
        "We reserve the right to refuse any order you place with us. We may, in our sole discretion, limit or cancel quantities purchased per person, per household or per order.",
        "In the event that we make a change to or cancel an order, we may attempt to notify you by contacting the e-mail and/or billing address/phone number provided at the time the order was made."
      ]
    },
    {
      "title": "Third-Party Links",
      "type": "paragraphs",
      "content": ["Certain content, products and services available via our Service may include materials from third-parties. Third-party links on this site may direct you to third-party websites that are not affiliated with us. We are not responsible for examining or evaluating the content or accuracy and we do not warrant and will not have any liability or responsibility for any third-party materials or websites."]
    },
    {
      "title": "Questions & Feedback",
      "type": "paragraphs",
      "content": ["If you have any questions about these Terms & Conditions, please contact us at +62 816-261-783 or through our contact page."]
    },
    {
      "title": "Acceptance of Terms",
      "type": "paragraphs",
      "content": ["By using this website, you signify your acceptance of these Terms and Conditions. If you do not agree to these terms, please do not use our website."]
    }
  ]
}')
ON CONFLICT (page_key, locale) DO NOTHING;

-- Seed default EN Privacy Policy
INSERT INTO page_contents (page_key, locale, content) VALUES
('privacy', 'en', '{
  "title": "Privacy Policy",
  "subtitle": "Last updated: January 2024",
  "intro": "At MYKONOS, we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and make purchases.",
  "sections": [
    {
      "title": "Information We Collect",
      "type": "paragraphs",
      "content": ["We collect information you provide directly to us, such as when you create an account, make a purchase, or contact us for support. We also automatically collect certain information about your device and how you interact with our website."]
    },
    {
      "title": "How We Use Your Information",
      "type": "paragraphs",
      "content": ["We use the information we collect to process your orders, communicate with you about your purchases, send promotional emails (with your consent), improve our services, prevent fraud, and comply with legal obligations."]
    },
    {
      "title": "Information Sharing",
      "type": "paragraphs",
      "content": ["We do not sell, trade, or otherwise transfer your personal information to outside parties except to trusted third parties who assist us in operating our website, conducting our business, or servicing you, as long as those parties agree to keep this information confidential."]
    },
    {
      "title": "Data Security",
      "type": "paragraphs",
      "content": ["We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. All transactions are processed through secure encrypted connections."]
    },
    {
      "title": "Cookies",
      "type": "paragraphs",
      "content": ["We use cookies to enhance your experience on our website. You can choose to disable cookies through your browser settings, but this may affect the functionality of our website."]
    },
    {
      "title": "Your Rights",
      "type": "paragraphs",
      "content": ["You have the right to access, correct, or delete your personal information. You may also opt out of marketing communications at any time. To exercise these rights, please contact us at privacy@mykonos.com."]
    },
    {
      "title": "Children''s Privacy",
      "type": "paragraphs",
      "content": ["Our website is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13."]
    },
    {
      "title": "Changes to This Policy",
      "type": "paragraphs",
      "content": ["We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page with an updated date."]
    },
    {
      "title": "Contact Us",
      "type": "contact",
      "content": ["If you have any questions about this Privacy Policy, please contact us at privacy@mykonos.com or +62 816-261-783."]
    }
  ],
  "consent": "By using our website, you hereby consent to our Privacy Policy and agree to its terms."
}')
ON CONFLICT (page_key, locale) DO NOTHING;

-- Seed default EN FAQs
INSERT INTO page_contents (page_key, locale, content) VALUES
('faqs', 'en', '{
  "title": "Help Center",
  "subtitle": "Find answers to frequently asked questions",
  "categories": [
    {
      "name": "Ordering",
      "questions": [
        {
          "q": "HOW TO ORDER?",
          "a": "1. Browse and Select Products - From the home page, click on a category to browse our fragrances.\n\n2. Add to Cart and Review Order - Choose your desired size and quantity, and proceed to click the \"Add to cart\" button.\n\n3. Sign In - For registered shoppers, sign in to your account. For new shoppers, create an account for faster checkouts.\n\n4. Checkout - Choose your payment and shipping method, then review your order before payment.\n\n5. Confirm Payment - Confirm your payment if you chose Bank Transfer.\n\n6. Finish Shopping - Sit back and wait for your order. Track it on the Orders page."
        },
        {
          "q": "HOW TO CHECK MY ORDER STATUS?",
          "a": "You can check your order status on the Orders page in your account or through the confirmation email sent to your registered email address."
        },
        {
          "q": "CAN I EDIT MY ORDER?",
          "a": "Once an order has been placed and payment confirmed, we cannot guarantee changes. Please contact us immediately at +62 816-261-783 if you need to modify your order."
        }
      ]
    },
    {
      "name": "Shipping & Delivery",
      "questions": [
        {
          "q": "WHY IS MY DELIVERY STATUS PENDING OR DELAYED?",
          "a": "Delivery delays can occur due to courier services, weather conditions, or high order volumes. Once your package has been handed to the courier, MYKONOS is not responsible for delays. Please contact us at +62 816-261-783 for assistance."
        },
        {
          "q": "DO YOU SHIP WORLDWIDE?",
          "a": "Yes, we offer international shipping. Domestic orders (Indonesia) take 3-5 working days, while international orders take 5-15 working days depending on the destination and customs processing."
        }
      ]
    },
    {
      "name": "Returns & Issues",
      "questions": [
        {
          "q": "I RECEIVED DAMAGED OR WRONG ITEM.",
          "a": "Please inspect your order upon reception and record an unboxing video. If you find any defects or receive the wrong item, contact us at +62 816-261-783. An unboxing video is required to claim a return or refund."
        },
        {
          "q": "I ORDERED THE WRONG ITEM.",
          "a": "We have a 3-day return policy. Contact us at +62 816-261-783 to request a return. If accepted, we will send you a return shipping label and instructions."
        }
      ]
    },
    {
      "name": "Store & Products",
      "questions": [
        {
          "q": "DO YOU HAVE OFFLINE STORE?",
          "a": "Currently, MYKONOS operates exclusively online to provide you with the best prices and widest selection."
        },
        {
          "q": "WILL THERE BE RESTOCKS FOR THE SOLD OUT ITEMS?",
          "a": "We regularly restock popular items. Please contact us at +62 816-261-783 or follow our social media for restock announcements."
        }
      ]
    }
  ]
}')
ON CONFLICT (page_key, locale) DO NOTHING;

-- Indonesian seeds (shorter, matching originals)
INSERT INTO page_contents (page_key, locale, content) VALUES
('shipping', 'id', '{
  "title": "Kebijakan Pengiriman",
  "subtitle": "Terakhir diperbarui: Januari 2024",
  "sections": [
    {"title": "Metode Pengiriman","type":"paragraphs","highlight":"Pemberitahuan Pre-Order: Semua produk MYKONOS dibuat berdasarkan pesanan. Harap izinkan 3-5 hari kerja untuk produksi sebelum pesanan Anda dikirim.","content":["Kami bermitra dengan layanan kurir terpercaya untuk memastikan wewangian Anda tiba dengan aman dan tepat waktu."]},
    {"title":"Catatan Pemrosesan","type":"numbered_list","content":["Pesanan diproses dalam 3-5 hari kerja setelah konfirmasi pembayaran.","Anda akan menerima nomor pelacakan melalui email setelah pesanan Anda dikirim.","MYKONOS tidak bertanggung jawab atas keterlambatan yang disebabkan oleh layanan kurir, bea cukai, atau kondisi cuaca."]},
    {"title":"Jadwal Pengiriman","type":"subsections","subsections":[{"title":"Pesanan Domestik (Indonesia)","content":["Estimasi pengiriman: 3-5 hari kerja setelah pengiriman."]},{"title":"Pesanan Internasional","content":["Estimasi pengiriman: 5-15 hari kerja setelah pengiriman, tergantung tujuan dan pemrosesan bea cukai."]}]}
  ]
}'),
('returns', 'id', '{
  "title": "Kebijakan Pengembalian",
  "subtitle": "Terakhir diperbarui: Januari 2024",
  "sections": [
    {"title":"Pengembalian & Penukaran","type":"paragraphs","content":["Kami memiliki kebijakan pengembalian 3 hari setelah menerima barang Anda.","Untuk mengajukan pengembalian, hubungi kami di +62 816-261-783. Jika diterima, kami akan mengirimkan label pengiriman pengembalian.","Untuk penukaran tercepat, kembalikan barang dan lakukan pemesanan baru."]},
    {"title":"Kerusakan & Masalah","type":"paragraphs","highlight":"Penting: Video unboxing diperlukan untuk mengklaim pengembalian atau pengembalian dana.","content":["Harap periksa pesanan Anda dan segera hubungi kami jika barang rusak atau salah."]},
    {"title":"Barang yang Tidak Dapat Dikembalikan","type":"list","intro":"Jenis barang tertentu tidak dapat dikembalikan, termasuk:","content":["Barang mudah rusak","Produk kustom atau personalisasi","Produk perawatan pribadi","Bahan berbahaya","Barang sale atau kartu hadiah"]},
    {"title":"Pengembalian Dana","type":"paragraphs","content":["Kami akan memberi tahu Anda setelah memeriksa pengembalian Anda.","Jika disetujui, pengembalian dana akan diproses dalam 10 hari kerja ke metode pembayaran asli Anda."]}
  ]
}'),
('terms', 'id', '{
  "title": "Syarat & Ketentuan",
  "subtitle": "Terakhir diperbarui: Januari 2024",
  "sections": [
    {"title":"Ketentuan Umum","type":"paragraphs","content":["Dengan mengakses dan melakukan pemesanan di MYKONOS, Anda menyetujui syarat dan ketentuan yang tercantum di bawah ini.","Syarat ini berlaku untuk seluruh situs web dan komunikasi antara Anda dan MYKONOS.","MYKONOS tidak bertanggung jawab atas kerugian langsung atau tidak langsung yang timbul dari penggunaan situs ini."]},
    {"title":"Perubahan & Modifikasi","type":"paragraphs","content":["MYKONOS berhak mengubah syarat ini sewaktu-waktu.","Versi terbaru akan menggantikan semua versi sebelumnya.","Dengan menggunakan situs ini, Anda menyetujui Syarat dan Ketentuan ini."]},
    {"title":"Kebijakan Privasi","type":"paragraphs","content":["Kami akan mengumpulkan dan menggunakan informasi pribadi semata-mata untuk memenuhi tujuan yang ditetapkan.","Kami hanya akan menyimpan informasi pribadi selama diperlukan."]},
    {"title":"Kepemilikan Konten","type":"paragraphs","content":["Semua konten di situs ini adalah milik MYKONOS dan dilindungi oleh hukum kekayaan intelektual yang berlaku."]},
    {"title":"Informasi Produk","type":"paragraphs","content":["Kami berupaya menampilkan warna dan gambar produk seakurat mungkin. Kami berhak membatasi penjualan produk."]},
    {"title":"Pemesanan & Penagihan","type":"paragraphs","content":["Kami berhak menolak pesanan dan membatasi kuantitas yang dibeli per orang atau per pesanan."]},
    {"title":"Tautan Pihak Ketiga","type":"paragraphs","content":["Tautan pihak ketiga di situs ini mungkin mengarah ke situs web yang tidak berafiliasi dengan kami."]},
    {"title":"Pertanyaan & Umpan Balik","type":"paragraphs","content":["Jika Anda memiliki pertanyaan tentang Syarat & Ketentuan ini, silakan hubungi kami di +62 816-261-783."]},
    {"title":"Penerimaan Syarat","type":"paragraphs","content":["Dengan menggunakan situs web ini, Anda menyatakan menerima Syarat dan Ketentuan ini."]}
  ]
}'),
('privacy', 'id', '{
  "title": "Kebijakan Privasi",
  "subtitle": "Terakhir diperbarui: Januari 2024",
  "intro": "Di MYKONOS, kami berkomitmen untuk melindungi privasi Anda. Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi informasi Anda.",
  "sections": [
    {"title":"Informasi yang Kami Kumpulkan","type":"paragraphs","content":["Kami mengumpulkan informasi yang Anda berikan secara langsung, seperti saat Anda membuat akun, melakukan pembelian, atau menghubungi kami."]},
    {"title":"Cara Kami Menggunakan Informasi Anda","type":"paragraphs","content":["Kami menggunakan informasi untuk memproses pesanan, berkomunikasi, mengirim email promosi (dengan persetujuan Anda), dan meningkatkan layanan kami."]},
    {"title":"Berbagi Informasi","type":"paragraphs","content":["Kami tidak menjual atau mengalihkan informasi pribadi Anda kecuali kepada mitra terpercaya yang membantu operasional kami."]},
    {"title":"Keamanan Data","type":"paragraphs","content":["Kami menerapkan langkah-langkah keamanan yang sesuai untuk melindungi informasi pribadi Anda."]},
    {"title":"Cookie","type":"paragraphs","content":["Kami menggunakan cookie untuk meningkatkan pengalaman Anda di situs web kami."]},
    {"title":"Hak Anda","type":"paragraphs","content":["Anda berhak mengakses, mengoreksi, atau menghapus informasi pribadi Anda. Hubungi kami di privacy@mykonos.com."]},
    {"title":"Privasi Anak-anak","type":"paragraphs","content":["Situs web kami tidak ditujukan untuk anak-anak di bawah 13 tahun."]},
    {"title":"Perubahan Kebijakan","type":"paragraphs","content":["Kami dapat memperbarui Kebijakan Privasi ini sewaktu-waktu dengan mengirimkan pemberitahuan di halaman ini."]},
    {"title":"Hubungi Kami","type":"contact","content":["Jika ada pertanyaan tentang Kebijakan Privasi ini, hubungi kami di privacy@mykonos.com."]}
  ],
  "consent": "Dengan menggunakan situs web kami, Anda menyetujui Kebijakan Privasi ini."
}'),
('faqs', 'id', '{
  "title": "Pusat Bantuan",
  "subtitle": "Temukan jawaban atas pertanyaan yang sering diajukan",
  "categories": [
    {"name":"Pemesanan","questions":[{"q":"BAGAIMANA CARA MEMESAN?","a":"1. Jelajahi dan Pilih Produk\n\n2. Tambahkan ke Keranjang\n\n3. Masuk ke akun Anda\n\n4. Checkout dan pilih metode pembayaran\n\n5. Konfirmasi pembayaran\n\n6. Pantau status pesanan di halaman Pesanan"},{"q":"BAGAIMANA CARA MEMERIKSA STATUS PESANAN?","a":"Periksa status pesanan di halaman Pesanan di akun Anda atau melalui email konfirmasi."},{"q":"BISAKAH SAYA MENGEDIT PESANAN?","a":"Setelah pesanan dikonfirmasi, kami tidak dapat menjamin perubahan. Hubungi kami di +62 816-261-783."}]},
    {"name":"Pengiriman & Pengantaran","questions":[{"q":"MENGAPA STATUS PENGIRIMAN SAYA TERTUNDA?","a":"Keterlambatan dapat terjadi karena kurir, cuaca, atau volume pesanan tinggi. Hubungi kami di +62 816-261-783."},{"q":"APAKAH ANDA MENGIRIM KE SELURUH DUNIA?","a":"Ya, kami menawarkan pengiriman internasional. Domestik 3-5 hari kerja, internasional 5-15 hari kerja."}]},
    {"name":"Pengembalian & Masalah","questions":[{"q":"SAYA MENERIMA BARANG RUSAK ATAU SALAH.","a":"Rekam video unboxing dan segera hubungi kami di +62 816-261-783. Video unboxing diperlukan untuk klaim."},{"q":"SAYA MEMESAN BARANG YANG SALAH.","a":"Hubungi kami dalam 3 hari di +62 816-261-783. Jika diterima, kami kirimkan label pengembalian."}]},
    {"name":"Toko & Produk","questions":[{"q":"APAKAH ANDA MEMILIKI TOKO OFFLINE?","a":"Saat ini MYKONOS beroperasi secara eksklusif online."},{"q":"APAKAH AKAN ADA RESTOCK?","a":"Kami rutin melakukan restock. Ikuti media sosial kami untuk pengumuman restock."}]}
  ]
}')
ON CONFLICT (page_key, locale) DO NOTHING;
