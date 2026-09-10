export const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || ''
export const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || ''
export const PAYPAL_API_BASE =
  process.env.PAYPAL_API_BASE ||
  (process.env.NODE_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com')

export function getPayPalAccessToken(): Promise<string> {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    console.error('[PAYPAL-API] Missing credentials! PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET is not set')
    return Promise.reject(new Error('PayPal credentials not configured'))
  }

  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')
  return fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
    .then((res) => res.json())
    .then((data) => {
      if (!data.access_token) {
        throw new Error(`Failed to get PayPal access token: ${data.error || 'unknown'} - ${data.error_description || ''}`)
      }
      return data.access_token as string
    })
}
