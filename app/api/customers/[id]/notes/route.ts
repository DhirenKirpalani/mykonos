import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

/**
 * Get customer notes
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

    if (!user || !['support_agent', 'inventory_manager', 'admin'].includes(user.role || '')) {
      return NextResponse.json(
        { error: 'Forbidden - Staff access required' },
        { status: 403 }
      )
    }

    const { id } = params

    // Get customer notes
    const { data: notes, error } = await supabase
      .from('customer_notes')
      .select('*, created_by_user:users!customer_notes_created_by_fkey(first_name, last_name, email)')
      .eq('user_id', id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      notes: notes || [],
    })
  } catch (error: any) {
    console.error('Customer notes fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch customer notes' },
      { status: 500 }
    )
  }
}

/**
 * Add customer note
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

    const { id } = params
    const body = await request.json()
    const { note, is_important } = body

    if (!note) {
      return NextResponse.json(
        { error: 'Note is required' },
        { status: 400 }
      )
    }

    // Use database function to add note
    const { data: noteId, error } = await supabase.rpc('add_customer_note', {
      p_user_id: id,
      p_note: note,
      p_is_important: is_important || false,
    } as any)

    if (error) throw error

    return NextResponse.json({
      message: 'Note added successfully',
      note_id: noteId,
    })
  } catch (error: any) {
    console.error('Add customer note error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to add customer note' },
      { status: 500 }
    )
  }
}
