/**
 * Supported payment gateways. 'paypal' is reserved for future integration.
 */
export type PaymentGateway = 'midtrans' | 'stripe' | 'paypal'

/**
 * Region key used for payment gateway configuration.
 * 'ID' = Indonesia, 'global' = everywhere else.
 */
export type PaymentRegionKey = 'ID' | 'global'

export interface PaymentGatewayRegionConfig {
  enabled: PaymentGateway[]
  default: PaymentGateway
}

export type PaymentGatewayConfig = Record<PaymentRegionKey, PaymentGatewayRegionConfig>

/**
 * Fallback config used if the system_settings entry is missing or fails to load.
 * Mirrors the original hardcoded behavior (Midtrans for ID, Stripe for everywhere else).
 */
export const DEFAULT_PAYMENT_GATEWAY_CONFIG: PaymentGatewayConfig = {
  ID: { enabled: ['midtrans', 'stripe'], default: 'midtrans' },
  global: { enabled: ['stripe'], default: 'stripe' },
}

/**
 * Gateways that are fully implemented and safe to route orders to.
 * PayPal is intentionally excluded until its integration is complete.
 */
const IMPLEMENTED_GATEWAYS: PaymentGateway[] = ['midtrans', 'stripe']

/**
 * Maps a region code (e.g. 'ID', 'US', 'SG') to the payment region key.
 */
export function getPaymentRegionKey(regionCode: string | undefined): PaymentRegionKey {
  return regionCode === 'ID' ? 'ID' : 'global'
}

/**
 * Resolves the gateway to use for a given region, given a (possibly partial) config.
 * Falls back to the default config, and further falls back to an implemented
 * gateway if the configured default isn't built yet (e.g. 'paypal').
 */
export function resolveDefaultGateway(
  regionCode: string | undefined,
  config?: PaymentGatewayConfig | null
): PaymentGateway {
  const regionKey = getPaymentRegionKey(regionCode)
  const regionConfig =
    config?.[regionKey] ?? DEFAULT_PAYMENT_GATEWAY_CONFIG[regionKey]

  let gateway = regionConfig?.default

  // Fall back if default isn't set or isn't in the enabled list
  if (!gateway || (regionConfig?.enabled && !regionConfig.enabled.includes(gateway))) {
    gateway = regionConfig?.enabled?.[0] ?? DEFAULT_PAYMENT_GATEWAY_CONFIG[regionKey].default
  }

  // Fall back if the resolved gateway isn't implemented yet (e.g. PayPal)
  if (!IMPLEMENTED_GATEWAYS.includes(gateway)) {
    const implementedFallback = regionConfig?.enabled?.find((g) => IMPLEMENTED_GATEWAYS.includes(g))
    gateway = implementedFallback ?? DEFAULT_PAYMENT_GATEWAY_CONFIG[regionKey].default
  }

  return gateway
}

/**
 * Client-side fetch of the payment gateway config from the public API.
 * Fails open to DEFAULT_PAYMENT_GATEWAY_CONFIG on any error.
 */
export async function fetchPaymentGatewayConfig(): Promise<PaymentGatewayConfig> {
  try {
    const response = await fetch('/api/payment-gateways')
    if (!response.ok) return DEFAULT_PAYMENT_GATEWAY_CONFIG
    const data = await response.json()
    return data?.config ?? DEFAULT_PAYMENT_GATEWAY_CONFIG
  } catch (error) {
    console.error('Error fetching payment gateway config:', error)
    return DEFAULT_PAYMENT_GATEWAY_CONFIG
  }
}

/**
 * Determines which payment gateway to use based on region only.
 * @deprecated Prefer fetching the config via fetchPaymentGatewayConfig() and
 * calling resolveDefaultGateway() so the CMS-configured gateway is respected.
 */
export function getPaymentGateway(regionCode: string | undefined): 'midtrans' | 'stripe' {
  const gateway = resolveDefaultGateway(regionCode)
  return gateway === 'paypal' ? 'stripe' : gateway
}

/**
 * Resolves the gateway to actually use at checkout, enforcing hard currency
 * constraints on top of the CMS-configured default:
 * - Midtrans only supports IDR, so it's only usable for the 'ID' region.
 *   If configured as default for 'global', falls back to Stripe.
 * - Stripe supports both USD and IDR, so it can be used for either region.
 * - PayPal falls back to an implemented gateway until it's built.
 */
export function resolveCheckoutGateway(
  regionCode: string | undefined,
  config?: PaymentGatewayConfig | null
): PaymentGateway {
  const isID = regionCode === 'ID'
  let gateway = resolveDefaultGateway(regionCode, config)

  if (gateway === 'midtrans' && !isID) {
    console.warn("Payment gateway config requests Midtrans for a non-Indonesia region, but Midtrans only supports IDR. Falling back to Stripe.")
    gateway = 'stripe'
  }

  return gateway
}

/**
 * ISO currency codes that Stripe treats as zero-decimal (no cents).
 * See: https://stripe.com/docs/currencies#zero-decimal
 */
const ZERO_DECIMAL_CURRENCIES = [
  'bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga',
  'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf',
]

export function isZeroDecimalCurrency(currency: string): boolean {
  return ZERO_DECIMAL_CURRENCIES.includes(currency.toLowerCase())
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
