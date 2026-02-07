import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

/**
 * Get all fragrance families
 */
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

    const { data: families, error } = await supabase
      .from('fragrance_families')
      .select('*')
      .order('display_order')

    if (error) throw error

    return NextResponse.json({
      fragrance_families: families || [],
    })
  } catch (error: any) {
    console.error('Fragrance families fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch fragrance families' },
      { status: 500 }
    )
  }
}
