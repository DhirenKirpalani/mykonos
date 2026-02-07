'use client'

import { useState } from 'react'
import { Tag, X, Check, Loader2 } from 'lucide-react'
import { useRegion } from '@/contexts/RegionContext'
import { PromoCodeValidation } from '@/lib/types/promo'
import { formatDiscount } from '@/lib/utils/pricing'
import { toast } from 'sonner'

interface PromoCodeInputProps {
  cartTotal: number
  onPromoApplied: (validation: PromoCodeValidation) => void
  onPromoRemoved: () => void
  appliedPromoCode: string | null
}

export function PromoCodeInput({
  cartTotal,
  onPromoApplied,
  onPromoRemoved,
  appliedPromoCode,
}: PromoCodeInputProps) {
  const { region, detectionResult } = useRegion()
  const [code, setCode] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleApply = async () => {
    if (!code.trim()) {
      setError('Please enter a promo code')
      return
    }

    if (!region || !detectionResult) {
      setError('Region not detected')
      return
    }

    setIsValidating(true)
    setError(null)

    try {
      const response = await fetch('/api/promo-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          region_id: region.id,
          cart_total: cartTotal,
        }),
      })

      const validation: PromoCodeValidation = await response.json()

      if (!validation.is_valid) {
        setError(validation.error_message || 'Invalid promo code')
        toast.error(validation.error_message || 'Invalid promo code')
        return
      }

      onPromoApplied(validation)
      setCode('')
      setError(null)
      
      const discountText = validation.promo_code
        ? formatDiscount(
            validation.promo_code.discount_type,
            validation.promo_code.discount_value,
            region
          )
        : `$${validation.discount_amount.toFixed(2)} off`
      
      toast.success('Promo code applied!', {
        description: discountText,
      })
    } catch (error: any) {
      setError('Failed to validate promo code')
      toast.error('Failed to validate promo code')
    } finally {
      setIsValidating(false)
    }
  }

  const handleRemove = () => {
    onPromoRemoved()
    setCode('')
    setError(null)
    toast.info('Promo code removed')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApply()
    }
  }

  if (appliedPromoCode) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-900">Promo code applied</p>
              <p className="text-sm text-green-700">{appliedPromoCode}</p>
            </div>
          </div>
          <button
            onClick={handleRemove}
            className="rounded-md p-2 text-green-700 transition-colors hover:bg-green-100"
            title="Remove promo code"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              setError(null)
            }}
            onKeyPress={handleKeyPress}
            placeholder="Enter promo code"
            disabled={isValidating}
            className="w-full rounded-md border border-input bg-background py-2 pl-10 pr-4 text-sm uppercase focus:border-luxury-gold focus:outline-none focus:ring-1 focus:ring-luxury-gold disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <button
          onClick={handleApply}
          disabled={isValidating || !code.trim()}
          className="rounded-md bg-luxury-gold px-6 py-2 text-sm font-medium text-luxury-navy transition-all hover:bg-luxury-gold-light disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isValidating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Apply'
          )}
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
