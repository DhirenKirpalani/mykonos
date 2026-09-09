export const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || ''
export const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || ''
export const PAYPAL_API_BASE =
  process.env.PAYPAL_API_BASE ||
  (process.env.NODE_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com')

export function getPayPalAccessToken(): Promise<string> {
  console.log('🔵 [PAYPAL-API] Getting access token...')
  console.log('🔵 [PAYPAL-API] Client ID:', PAYPAL_CLIENT_ID ? `${PAYPAL_CLIENT_ID.substring(0, 10)}...` : 'MISSING')
  console.log('🔵 [PAYPAL-API] Client Secret:', PAYPAL_CLIENT_SECRET ? 'SET' : 'MISSING')
  console.log('🔵 [PAYPAL-API] API Base:', PAYPAL_API_BASE)

  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    console.error('❌ [PAYPAL-API] Missing credentials! PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET is not set')
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
    .then((res) => {
      console.log('📡 [PAYPAL-API] OAuth response status:', res.status)
      return res.json()
    })
    .then((data) => {
      console.log('📡 [PAYPAL-API] OAuth response:', { hasToken: !!data.access_token, error: data.error, errorDesc: data.error_description })
      if (!data.access_token) {
        throw new Error(`Failed to get PayPal access token: ${data.error || 'unknown'} - ${data.error_description || ''}`)
      }
      console.log('✅ [PAYPAL-API] Access token obtained')
      return data.access_token as string
    })
}
