'use client'

import { useLanguage } from '@/contexts/LanguageContext'

interface ProductShippingInfoProps {
  product: any
}

export function ProductShippingInfo({ product }: ProductShippingInfoProps) {
  const { t } = useLanguage()
  
  // Use pre_order_duration_days (default 30 days as all products are pre-order)
  const preOrderDays = product.pre_order_duration_days || 30
  
  // Calculate actual dates
  const today = new Date()
  const estimateStartDate = new Date(today)
  estimateStartDate.setDate(today.getDate() + preOrderDays + 3)
  
  const estimateEndDate = new Date(today)
  estimateEndDate.setDate(today.getDate() + preOrderDays + 5)
  
  // Format dates as "DD MMM"
  const formatDate = (date: Date) => {
    const day = date.getDate()
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    const month = months[date.getMonth()]
    return `${day} ${month}`
  }

  return (
    <div className="flex items-start gap-3">
      <svg className="mt-1 h-5 w-5 text-[#26AA99]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div className="flex-1">
        <p className="text-sm text-gray-600">
          {t.products.preOrder} ({t.products.shippedIn} {preOrderDays} {t.products.days}). {t.products.estimatedArrival} {formatDate(estimateStartDate)} - {formatDate(estimateEndDate)}
        </p>
      </div>
    </div>
  )
}
