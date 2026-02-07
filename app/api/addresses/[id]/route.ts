import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
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
      await supabase
        .from('shipping_addresses')
        .update({ is_default: false } as any)
        .eq('user_id', session.user.id)
    }

    const { data: address, error } = await supabase
      .from('shipping_addresses')
      .update({
        full_name,
        address_line1,
        address_line2: address_line2 || null,
        city,
        state_province,
        postal_code,
        country,
        phone,
        is_default: is_default || false,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', params.id)
      .eq('user_id', session.user.id)
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
      { error: error.message || 'Failed to update address' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const { error } = await supabase
      .from('shipping_addresses')
      .delete()
      .eq('id', params.id)
      .eq('user_id', session.user.id)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete address' },
      { status: 500 }
    )
  }
}
