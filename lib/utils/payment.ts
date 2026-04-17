/**
 * Determines which payment gateway to use based on region
 */
export function getPaymentGateway(regionCode: string | undefined): 'midtrans' | 'stripe' {
  // Use Midtrans for Indonesia, Stripe for all other regions
  return regionCode === 'ID' ? 'midtrans' : 'stripe'
}

/**
 * Converts amount to the appropriate currency based on payment gateway
 */
export function convertToPaymentCurrency(
  amount: number,
  gateway: 'midtrans' | 'stripe',
  currency: 'USD' | 'IDR'
): number {
  if (gateway === 'midtrans') {
    // Midtrans always uses IDR
    if (currency === 'USD') {
      return Math.round(amount * 15000) // USD to IDR conversion
    }
    return Math.round(amount)
  } else {
    // Stripe uses the original currency
    if (currency === 'IDR') {
      return amount / 15000 // IDR to USD conversion
    }
    return amount
  }
}
