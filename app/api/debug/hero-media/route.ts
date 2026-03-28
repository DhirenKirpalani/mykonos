import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get ALL hero media items (not just active)
    const { data: allItems, error: allError } = await supabase
      .from('hero_media')
      .select('*')
      .order('created_at', { ascending: false })

    if (allError) throw allError

    // Get only active items
    const { data: activeItems, error: activeError } = await supabase
      .from('hero_media')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (activeError) throw activeError

    return NextResponse.json({
      total_items: allItems?.length || 0,
      active_items: activeItems?.length || 0,
      all_items: allItems,
      active_items_data: activeItems
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
