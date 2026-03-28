'use client'

interface ProductShippingInfoProps {
  product: any
}

export function ProductShippingInfo({ product }: ProductShippingInfoProps) {
  const shippingPeriodDays = product.shipping_period_days || 4
  
  // Calculate actual dates
  const today = new Date()
  const estimateStartDate = new Date(today)
  estimateStartDate.setDate(today.getDate() + shippingPeriodDays + 5)
  
  const estimateEndDate = new Date(today)
  estimateEndDate.setDate(today.getDate() + shippingPeriodDays + 7)
  
  // Format dates as "DD MMM" in Indonesian
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
          Pengiriman {shippingPeriodDays} hari. Estimasi tiba {formatDate(estimateStartDate)} - {formatDate(estimateEndDate)}
        </p>
      </div>
    </div>
  )
}
