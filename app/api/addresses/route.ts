import { NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: addresses, error } = await supabase
      .from('shipping_addresses')
      .select('*')
      .eq('user_id', session.user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ addresses })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch addresses' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      full_name,
      address_line1,
      address_line2,
      city,
      state_province,
      postal_code,
      country,
      phone,
      is_default,
    } = body

    // If setting as default, unset other defaults first
    if (is_default) {
      const updateDefault: Database['public']['Tables']['shipping_addresses']['Update'] = {
        is_default: false
      }
      const query = supabase.from('shipping_addresses')
      await (query.update as any)(updateDefault).eq('user_id', session.user.id)
    }

    const insertData: Database['public']['Tables']['shipping_addresses']['Insert'] = {
      user_id: session.user.id,
      full_name,
      address_line1,
      address_line2: address_line2 || null,
      city,
      state_province,
      postal_code,
      country,
      phone,
      is_default: is_default || false,
    }

    const query2 = supabase.from('shipping_addresses')
    const { data: address, error } = await (query2.insert as any)(insertData)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ address })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create address' },
      { status: 500 }
    )
  }
}
