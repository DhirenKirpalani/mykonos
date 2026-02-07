import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
export const dynamic = 'force-dynamic'

/**
 * Get region details by region code
 */
export async function GET(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

    const { code } = params

    // Get region
    const { data: region, error: regionError } = await supabase
      .from('regions')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single()

    if (regionError || !region) {
      return NextResponse.json(
        { error: 'Region not found' },
        { status: 404 }
      )
    }

    // Get shipping zone
    const { data: shippingZone } = await supabase
      .from('shipping_zones')
      .select('*')
      .eq('region_id', (region as any).id)
      .single()

    // Get a sample country for this region
    const { data: countryRegion } = await supabase
      .from('country_regions')
      .select('*')
      .eq('region_id', (region as any).id)
      .limit(1)
      .single()

    return NextResponse.json({
      country_code: (countryRegion as any)?.country_code || 'US',
      region,
      country_region: countryRegion,
      shipping_zone: shippingZone,
      source: 'manual' as const,
    })
  } catch (error: any) {
    console.error('Get region error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get region' },
      { status: 500 }
    )
  }
}
