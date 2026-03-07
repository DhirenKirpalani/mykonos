'use client'

interface ProductShippingInfoProps {
  product: any
}

export function ProductShippingInfo({ product }: ProductShippingInfoProps) {
  const getShippingEstimate = () => {
    if (product.is_pre_order && product.pre_order_duration_days) {
      const days = product.pre_order_duration_days
      const startDate = new Date()
      startDate.setDate(startDate.getDate() + days)
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 3) // Add 3 days range
      
      const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
      }
      
      return `Pre-Order: Get by ${formatDate(startDate)} - ${formatDate(endDate)} (${days} days processing)`
    }
    
    // Standard shipping
    const startDate = new Date()
    startDate.setDate(startDate.getDate() + 2)
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 3)
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
    }
    
    return `Get by ${formatDate(startDate)} - ${formatDate(endDate)}`
  }

  return (
    <div className="flex items-start gap-3">
      <svg className="mt-1 h-5 w-5 text-[#26AA99]" fill="currentColor" viewBox="0 0 20 20">
        <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
        <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
      </svg>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-700">Shipping</p>
        <p className="mt-1 text-sm text-gray-600">{getShippingEstimate()}</p>
        {product.is_pre_order && (
          <p className="mt-1 text-xs text-orange-600">⚠️ This is a pre-order item</p>
        )}
      </div>
    </div>
  )
}
