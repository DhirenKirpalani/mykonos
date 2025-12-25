export const translations = {
  en: {
    nav: {
      home: "HOME",
      catalog: "CATALOG",
      contact: "CONTACT",
      sale: "SALE"
    },
    footer: {
      followUs: "FOLLOW US for exclusive news and updates:",
      houseOfMykonos: "THE HOUSE OF MYKONOS",
      ourStory: "Our Story",
      contactUs: "Contact Us",
      customerService: "CUSTOMER SERVICE",
      shippingPolicy: "Shipping Policy",
      returnPolicy: "Return Policy",
      helpCenter: "Help Center",
      legal: "LEGAL",
      termsConditions: "Terms & Conditions",
      privacyPolicy: "Privacy Policy",
      copyright: "Mykonos. All rights reserved."
    },
    contact: {
      title: "Contact Us",
      subtitle: "We'd love to hear from you. Get in touch with our team.",
      sendMessage: "Send us a message",
      name: "Name",
      email: "Email",
      message: "Message",
      yourName: "Your name",
      yourEmail: "your@email.com",
      yourMessage: "Your message...",
      submit: "Send Message",
      getInTouch: "Get in touch",
      whatsapp: "WhatsApp",
      businessHours: "Business Hours",
      mondayFriday: "Monday - Friday",
      saturday: "Saturday",
      sunday: "Sunday",
      closed: "Closed",
      hours: {
        weekday: "9:00 AM - 6:00 PM",
        saturday: "10:00 AM - 4:00 PM"
      }
    },
    products: {
      new: "NEW",
      sale: "SALE",
      addToCart: "Add to Cart",
      quickAdd: "Quick Add"
    }
  },
  id: {
    nav: {
      home: "BERANDA",
      catalog: "KATALOG",
      contact: "KONTAK",
      sale: "DISKON"
    },
    footer: {
      followUs: "IKUTI KAMI untuk berita dan pembaruan eksklusif:",
      houseOfMykonos: "RUMAH MYKONOS",
      ourStory: "Cerita Kami",
      contactUs: "Hubungi Kami",
      customerService: "LAYANAN PELANGGAN",
      shippingPolicy: "Kebijakan Pengiriman",
      returnPolicy: "Kebijakan Pengembalian",
      helpCenter: "Pusat Bantuan",
      legal: "HUKUM",
      termsConditions: "Syarat & Ketentuan",
      privacyPolicy: "Kebijakan Privasi",
      copyright: "Mykonos. Hak cipta dilindungi."
    },
    contact: {
      title: "Hubungi Kami",
      subtitle: "Kami ingin mendengar dari Anda. Hubungi tim kami.",
      sendMessage: "Kirim pesan kepada kami",
      name: "Nama",
      email: "Email",
      message: "Pesan",
      yourName: "Nama Anda",
      yourEmail: "email@anda.com",
      yourMessage: "Pesan Anda...",
      submit: "Kirim Pesan",
      getInTouch: "Hubungi kami",
      whatsapp: "WhatsApp",
      businessHours: "Jam Operasional",
      mondayFriday: "Senin - Jumat",
      saturday: "Sabtu",
      sunday: "Minggu",
      closed: "Tutup",
      hours: {
        weekday: "9:00 - 18:00",
        saturday: "10:00 - 16:00"
      }
    },
    products: {
      new: "BARU",
      sale: "DISKON",
      addToCart: "Tambah ke Keranjang",
      quickAdd: "Tambah Cepat"
    }
  }
} as const;

export type Locale = keyof typeof translations;
export type TranslationKeys = typeof translations.en;
