import { NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
export const dynamic = 'force-dynamic'

/**
 * Get order notes
 */
export async function GET(
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

    // Check permission
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!user || !['support_agent', 'inventory_manager', 'admin'].includes((user as any).role || '')) {
      return NextResponse.json(
        { error: 'Forbidden - Staff access required' },
        { status: 403 }
      )
    }

    const { id } = params

    // Get order notes
    const { data: notes, error } = await supabase
      .from('order_notes')
      .select('*, created_by_user:users!order_notes_created_by_fkey(first_name, last_name, email)')
      .eq('order_id', id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      notes: notes || [],
    })
  } catch (error: any) {
    console.error('Order notes fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch order notes' },
      { status: 500 }
    )
  }
}

/**
 * Add order note
 */
export async function POST(
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

    // Check permission
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!user || !['inventory_manager', 'admin'].includes((user as any).role || '')) {
      return NextResponse.json(
        { error: 'Forbidden - Inventory manager access required' },
        { status: 403 }
      )
    }

    const { id } = params
    const body = await request.json()
    const { note } = body

    if (!note) {
      return NextResponse.json(
        { error: 'Note is required' },
        { status: 400 }
      )
    }

    // Add note
    const insertData: Database['public']['Tables']['order_notes']['Insert'] = {
      order_id: id,
      note,
      created_by: session.user.id,
    }

    const query = supabase.from('order_notes')
    const { data: newNote, error } = await (query.insert as any)(insertData)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      message: 'Note added successfully',
      note: newNote,
    })
  } catch (error: any) {
    console.error('Add note error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to add note' },
      { status: 500 }
    )
  }
}
