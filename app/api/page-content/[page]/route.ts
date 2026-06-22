import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { page: string } }
) {
  try {
    const { data, error } = await supabase
      .from('page_contents')
      .select('locale, content')
      .eq('page_key', params.page)

    if (error) throw error

    // Return as { en: {...}, id: {...} }
    const result: Record<string, any> = {}
    for (const row of data || []) {
      result[row.locale] = row.content
    }

    return NextResponse.json({ success: true, content: result })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
