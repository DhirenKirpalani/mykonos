'use client'

import { useRegion } from '@/contexts/RegionContext'

export function WhatsAppButton() {
  const { region } = useRegion()
  const isIndonesia = region?.code === 'ID'
  
  const whatsappNumberID = '6285780218514'
  const whatsappNumberInternational = '62816261783'
  const messageID = 'Halo! Saya ingin bertanya tentang produk Anda.'
  const messageEN = 'Hello! I would like to inquire about your products.'
  
  const whatsappNumber = isIndonesia ? whatsappNumberID : whatsappNumberInternational
  const message = isIndonesia ? messageID : messageEN
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl"
      style={{ background: 'linear-gradient(135deg, #071D49 0%, #122660 55%, #D9B25E 100%)' }}
      aria-label="Contact us on WhatsApp"
    >
      <svg
        viewBox="0 0 32 32"
        className="h-7 w-7 sm:h-10 sm:w-10"
        fill="white"
      >
        <path d="M16 0C7.164 0 0 7.164 0 16c0 2.825.738 5.488 2.031 7.794L0 32l8.394-2.031C10.7 31.262 13.363 32 16 32c8.836 0 16-7.164 16-16S24.836 0 16 0zm0 29.333c-2.456 0-4.794-.656-6.794-1.794l-.488-.281-5.056 1.225 1.225-5.056-.281-.488C3.656 20.794 3 18.456 3 16c0-7.181 5.819-13 13-13s13 5.819 13 13-5.819 13-13 13zm7.144-9.731c-.394-.2-2.331-1.15-2.694-1.281-.363-.131-.625-.2-.888.2-.263.394-1.019 1.281-1.25 1.544-.231.263-.463.294-.856.094-.394-.2-1.663-.613-3.169-1.956-1.169-1.044-1.956-2.331-2.188-2.725-.231-.394-.025-.606.175-.806.181-.181.394-.463.594-.694.2-.231.263-.394.394-.656.131-.263.069-.488-.031-.688-.1-.2-.888-2.138-1.219-2.925-.319-.769-.644-.663-.888-.675-.231-.013-.494-.013-.756-.013s-.694.1-1.056.488c-.363.394-1.381 1.35-1.381 3.294s1.413 3.819 1.606 4.081c.2.263 2.769 4.231 6.706 5.931.938.406 1.669.65 2.238.831.944.3 1.8.256 2.481.156.756-.113 2.331-.956 2.663-1.875.331-.919.331-1.706.231-1.875-.1-.169-.363-.269-.756-.469z"/>
      </svg>
    </a>
  )
}
