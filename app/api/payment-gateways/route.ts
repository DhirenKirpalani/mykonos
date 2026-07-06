import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DEFAULT_PAYMENT_GATEWAY_CONFIG, type PaymentGatewayConfig } from '@/lib/utils/payment'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export const dynamic = 'force-dynamic'

/**
 * GET /api/payment-gateways
 * Public endpoint (no auth required) that returns the enabled/default
 * payment gateway configuration per region (ID vs global).
 * Fails open to DEFAULT_PAYMENT_GATEWAY_CONFIG if the setting is missing or errors.
 */
export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'payment_gateways')
      .single()

    if (error || !data?.setting_value) {
      return NextResponse.json({ config: DEFAULT_PAYMENT_GATEWAY_CONFIG })
    }

    const config = data.setting_value as PaymentGatewayConfig

    return NextResponse.json({ config })
  } catch (error) {
    console.error('Error fetching payment gateway config:', error)
    return NextResponse.json({ config: DEFAULT_PAYMENT_GATEWAY_CONFIG })
  }
}
