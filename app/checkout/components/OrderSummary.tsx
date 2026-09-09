'use client'

import React, { memo, useState, useEffect } from 'react'
import { Lock, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PaymentMethods } from '@/components/PaymentMethods'
import { formatPrice as formatCurrencyPrice } from '@/lib/utils/currency'

type OrderSummaryProps = {
  allItems: { id: string; quantity: number }[]
  publicVouchers: any[]
  appliedPromo: any
  promoCode: string
  setPromoCode: (code: string) => void
  isApplyingPromo: boolean
  discount: number
  displaySubtotal: number
  displayShipping: number
  displayTax: number
  displayDiscount: number
  displayTotal: number
  shippingCost: number | null
  isLoadingShipping: boolean
  tax: number
  regionCurrency: string
  isGuest: boolean
  isProcessing: boolean
  selectedAddressId: string
  savedAddresses: any[]
  pendingOrder: any
  onApplyPromo: (code?: string) => void
  onRemovePromo: () => void
  onPlaceOrder: () => void
  onShowCheckoutModal: () => void
  t: any
}

function VoucherExpiryInfo({ validUntil }: { validUntil: string }) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number } | null>(null)

  useEffect(() => {
    const calculate = () => {
      const endDate = new Date(new Date(validUntil).toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
      const nowJakarta = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
      const diff = endDate.getTime() - nowJakarta.getTime()
      if (diff > 0) {
        return {
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / 1000 / 60) % 60),
        }
      }
      return null
    }
    const update = () => setTimeLeft(calculate())
    update()
    const timer = setInterval(update, 60000)
    return () => clearInterval(timer)
  }, [validUntil])

  if (!timeLeft) return null
  return (
    <span className="text-[10px] text-orange-500 font-medium">
      {timeLeft.days > 0
        ? `Expires in ${timeLeft.days}d ${timeLeft.hours}h`
        : timeLeft.hours > 0
          ? `Expires in ${timeLeft.hours}h ${timeLeft.minutes}m`
          : `Expires in ${timeLeft.minutes}m`}
    </span>
  )
}

export const OrderSummary = memo(function OrderSummary({
  allItems,
  publicVouchers,
  appliedPromo,
  promoCode,
  setPromoCode,
  isApplyingPromo,
  discount,
  displaySubtotal,
  displayShipping,
  displayTax,
  displayDiscount,
  displayTotal,
  shippingCost,
  isLoadingShipping,
  tax,
  regionCurrency,
  isGuest,
  isProcessing,
  selectedAddressId,
  savedAddresses,
  pendingOrder,
  onApplyPromo,
  onRemovePromo,
  onPlaceOrder,
  onShowCheckoutModal,
  t,
}: OrderSummaryProps) {
  const currencyProps = { currencyDisplay: 'code' as const }
  const fmt = (amount: number) => formatCurrencyPrice(amount, regionCurrency as any, currencyProps)

  return (
    <div className="lg:col-span-1">
      <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200 lg:sticky lg:top-4">
        <h2 className="text-xl font-montserrat font-bold text-gray-900 mb-4">{t.checkout.orderSummary}</h2>

        {/* Promo Code Section */}
        {allItems.length > 0 && (
          <div className="mb-4 pb-4 border-b border-gray-200">
            <h3 className="text-sm font-montserrat font-semibold text-gray-900 mb-3">{t.checkout.promoCode}</h3>

            {!appliedPromo && publicVouchers.length > 0 && (
              <div className="space-y-2 mb-3">
                {publicVouchers.map((v) => {
                  const discountLabel = v.discount_type === 'percentage'
                    ? `${v.discount_value}% off`
                    : fmt(v.discount_value)
                  const minLabel = v.min_purchase_amount ? `Min. ${fmt(v.min_purchase_amount)}` : null
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => onApplyPromo(v.code)}
                      disabled={isApplyingPromo}
                      className="w-full flex items-center justify-between p-3 rounded-lg border border-dashed border-luxury-gold bg-luxury-gold/5 hover:bg-luxury-gold/10 transition-colors text-left group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-luxury-gold font-mono tracking-wide">{v.code}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {minLabel && <span className="text-[10px] text-gray-500">{minLabel}</span>}
                          {v.valid_until && <VoucherExpiryInfo validUntil={v.valid_until} />}
                        </div>
                      </div>
                      <div className="ml-3 flex-shrink-0 flex flex-col items-end gap-2">
                        <span className="text-sm font-bold text-luxury-gold">{discountLabel}</span>
                        <span className="text-xs font-semibold text-luxury-gold border border-luxury-gold px-3 py-1 rounded-md group-hover:bg-luxury-gold group-hover:text-white transition-colors">
                          Apply
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {appliedPromo ? (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-bold text-green-900">
                    {appliedPromo.code || appliedPromo.promo_code?.code}
                    {appliedPromo.promo_code && (
                      <span className="font-normal text-green-700">
                        {' '}— {appliedPromo.promo_code.discount_type === 'percentage'
                          ? `${appliedPromo.promo_code.discount_value}% off`
                          : `${fmt(appliedPromo.promo_code.discount_value)} off`
                        } applied
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-green-700">You save {fmt(displayDiscount)}</p>
                </div>
                <button onClick={onRemovePromo} className="text-green-700 hover:text-green-900 text-sm font-medium">
                  {t.checkout.remove}
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder={t.checkout.enterCode}
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="flex-1 text-sm"
                />
                <Button
                  onClick={() => onApplyPromo()}
                  disabled={isApplyingPromo || !promoCode.trim()}
                  variant="outline"
                  size="sm"
                  className="px-4 min-w-[90px]"
                >
                  {isApplyingPromo ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {t.checkout.applying}
                    </span>
                  ) : t.checkout.apply}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Price Breakdown */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm text-gray-600">
            <span>{t.checkout.subtotal}</span>
            <span className="font-medium text-gray-900">{fmt(displaySubtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>{t.checkout.discount}</span>
              <span className="font-medium">-{fmt(displayDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-gray-600">
            <span className="flex items-center gap-2">
              {t.checkout.shipping}
              {isLoadingShipping && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                  <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Calculating...
                </span>
              )}
            </span>
            <span className={`font-medium ${shippingCost === null || shippingCost === 0 ? 'text-gray-500' : 'text-gray-900'}`}>
              {shippingCost === null ? (
                <span className="text-xs italic">{t.checkout.shippingCalculated}</span>
              ) : shippingCost === 0 ? (
                <span className="text-green-600">{t.checkout.free}</span>
              ) : (
                fmt(displayShipping)
              )}
            </span>
          </div>
          {tax > 0 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>{t.checkout.tax}</span>
              <span className="font-medium text-gray-900">{fmt(displayTax)}</span>
            </div>
          )}
        </div>

        {/* Total */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          <span className="text-base font-bold text-gray-900">{t.checkout.total}</span>
          <div className="text-right">
            <p className="text-xl font-bold text-luxury-navy">{fmt(displayTotal)}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {allItems.reduce((sum, item) => sum + item.quantity, 0)}{' '}
              {allItems.reduce((sum, item) => sum + item.quantity, 0) === 1 ? t.checkout.item : t.checkout.items}
            </p>
          </div>
        </div>

        {/* Checkout Button */}
        <div className="mt-6">
          {!isGuest ? (
            <>
              <Button
                onClick={onPlaceOrder}
                disabled={isProcessing || !selectedAddressId || allItems.length === 0}
                className="w-full bg-luxury-navy hover:bg-luxury-navy-light text-white font-semibold py-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                size="lg"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t.checkout.preparingOrder}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    {!pendingOrder && <Lock className="h-5 w-5" />}
                    {pendingOrder ? 'Continue Payment' : t.checkout.placeOrder} · {fmt(displayTotal)}
                  </span>
                )}
              </Button>
              <div className="mt-4">
                <PaymentMethods size="small" showTitle />
              </div>
              {!selectedAddressId && savedAddresses.length === 0 && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 text-center font-medium">
                    {t.checkout.pleaseAddAddress}
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <Button
                onClick={onShowCheckoutModal}
                className="w-full bg-luxury-navy hover:bg-luxury-navy-light text-white font-semibold py-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                size="lg"
              >
                <span className="flex items-center justify-center gap-2">
                  <Lock className="h-5 w-5" />
                  {t.checkout.continueToCheckout}
                </span>
              </Button>
              <div className="mt-4">
                <PaymentMethods size="small" showTitle />
              </div>
            </>
          )}

          {/* Trust Badges */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                <span>{t.checkout.secureCheckout}</span>
              </div>
              <div className="w-px h-4 bg-gray-300" />
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                <span>{t.checkout.safePayment}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
