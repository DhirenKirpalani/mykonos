import { Resend } from 'resend'

// Check for API key
const apiKey = process.env.RESEND_API_KEY
if (!apiKey) {
  console.error('❌ [RESEND] RESEND_API_KEY is not set in environment variables')
  console.error('❌ [RESEND] Email functionality will not work')
  throw new Error('RESEND_API_KEY is not set in environment variables')
}

console.log('✅ [RESEND] API Key found:', apiKey.substring(0, 10) + '...')

export const resend = new Resend(apiKey)

// Test mode: Use Resend's test email for initial testing
// Change this to your verified domain email once ready
const IS_TEST_MODE = process.env.EMAIL_TEST_MODE === 'true'

export const FROM_EMAIL = IS_TEST_MODE 
  ? 'Mykonos <onboarding@resend.dev>' // Resend's test email
  : 'Mykonos <orders@mykonos.com>'    // Your verified domain

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@mykonos.com'

console.log('📧 [RESEND] From Email:', FROM_EMAIL)
console.log('📧 [RESEND] Admin Email:', ADMIN_EMAIL)
console.log('🧪 [RESEND] Test Mode:', IS_TEST_MODE ? 'ENABLED' : 'DISABLED')
