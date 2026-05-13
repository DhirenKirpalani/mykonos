import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export const dynamic = 'force-dynamic'

/**
 * GET /api/system-settings/check?key=setting_key
 * Check if a specific feature is enabled
 * Public endpoint (no auth required) for client-side checks
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const key = searchParams.get('key')
    
    if (!key) {
      return NextResponse.json(
        { error: 'Missing setting key' },
        { status: 400 }
      )
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', key)
      .single()
    
    if (error || !data) {
      // Fail-open: if setting doesn't exist, return enabled
      return NextResponse.json({ enabled: true })
    }
    
    return NextResponse.json({
      enabled: data.setting_value?.enabled ?? true
    })
  } catch (error) {
    console.error('Error checking setting:', error)
    // Fail-open on error
    return NextResponse.json({ enabled: true })
  }
}
