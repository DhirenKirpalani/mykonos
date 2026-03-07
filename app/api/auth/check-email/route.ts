import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export async function POST(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    return NextResponse.json({
      exists: !!data && !error
    })
  } catch (error: any) {
    console.error('Check email error:', error)
    return NextResponse.json({ exists: false })
  }
}
