'use client'

import Image from 'next/image'
import { useLanguage } from '@/contexts/LanguageContext'

interface PaymentMethodsProps {
  className?: string
  showTitle?: boolean
  size?: 'small' | 'medium' | 'large'
}

export function PaymentMethods({ className = '', showTitle = false, size = 'medium' }: PaymentMethodsProps) {
  const { t } = useLanguage()
  // Ordered by familiarity: Cards, Banks, E-wallets, Paylater
  const paymentMethods = [
    // Cards
    { name: 'Visa', src: '/assets/payment-methods/visa.png', scale: 1 },
    { name: 'Mastercard', src: '/assets/payment-methods/mastercard.png', scale: 1 },

    // Banks
    { name: 'BCA', src: '/assets/payment-methods/bca.png', scale: 1 },
    { name: 'Mandiri', src: '/assets/payment-methods/mandiri.png', scale: 1 },
    { name: 'BNI', src: '/assets/payment-methods/bni.png', scale: 1 },
    { name: 'BRI', src: '/assets/payment-methods/bri.png', scale: 1 },

    // E-wallets (visually adjusted)
    { name: 'GoPay', src: '/assets/payment-methods/gopay_horizontal.svg', scale: 1.25 },
    { name: 'ShopeePay', src: '/assets/payment-methods/shopeepay_rectangle_orange.svg', scale: 1.2 },

    // Paylater
    { name: 'Kredivo', src: '/assets/payment-methods/kredivo.svg', scale: 1 },
    { name: 'Akulaku', src: '/assets/payment-methods/akulaku_paylater.svg', scale: 1 },
  ]

  // Consistent sizing
  const logoHeight = size === 'small' ? 20 : size === 'medium' ? 24 : 28
  const boxHeight = size === 'small' ? 36 : size === 'medium' ? 40 : 44
  const boxWidth = size === 'small' ? 56 : size === 'medium' ? 72 : 84

  return (
    <div className={className}>
      {showTitle && (
        <p className="text-xs text-gray-500 mb-3 text-center">
          {t.home.supportedPaymentMethods}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        {paymentMethods.map((method) => (
          <div
            key={method.name}
            className="bg-white rounded border border-gray-200 flex items-center justify-center overflow-hidden"
            style={{
              height: `${boxHeight}px`,
              width: `${boxWidth}px`,
              padding: '4px 8px',
            }}
          >
            <Image
              src={method.src}
              alt={method.name}
              width={100}
              height={logoHeight}
              className="w-auto object-contain"
              style={{
                height: `${logoHeight}px`,
                maxWidth: '100%',
                transform: `scale(${method.scale})`,
                transformOrigin: 'center',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}