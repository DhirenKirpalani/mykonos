import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

/**
 * Update announcement message
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()

    const updateData: any = {}
    if (body.message !== undefined) updateData.message = body.message
    if (body.is_active !== undefined) updateData.is_active = body.is_active
    if (body.display_order !== undefined) updateData.display_order = body.display_order

    const { error } = await supabase
      .from('announcement_messages')
      .update(updateData)
      .eq('id', id)

    if (error) throw error

    // Revalidate pages that show announcements
    try {
      revalidatePath('/')
      revalidateTag('announcement')
    } catch (revalidateError) {
      console.error('Cache revalidation error:', revalidateError)
    }

    return NextResponse.json({ message: 'Announcement updated successfully' })
  } catch (error: any) {
    console.error('Announcement update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update announcement' },
      { status: 500 }
    )
  }
}

/**
 * Delete announcement message
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    const { error } = await supabase
      .from('announcement_messages')
      .delete()
      .eq('id', id)

    if (error) throw error

    // Revalidate pages that show announcements
    try {
      revalidatePath('/')
      revalidateTag('announcement')
    } catch (revalidateError) {
      console.error('Cache revalidation error:', revalidateError)
    }

    return NextResponse.json({ message: 'Announcement deleted successfully' })
  } catch (error: any) {
    console.error('Announcement deletion error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete announcement' },
      { status: 500 }
    )
  }
}
