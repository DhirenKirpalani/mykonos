import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

/**
 * Update homepage banner
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

    const { error } = await supabase
      .from('homepage_banners')
      .update(body)
      .eq('id', id)

    if (error) throw error

    // Revalidate homepage
    try {
      revalidatePath('/')
      revalidateTag('homepage')
    } catch (revalidateError) {
      console.error('Cache revalidation error:', revalidateError)
    }

    return NextResponse.json({ message: 'Banner updated successfully' })
  } catch (error: any) {
    console.error('Banner update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update banner' },
      { status: 500 }
    )
  }
}

/**
 * Delete homepage banner
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
      .from('homepage_banners')
      .delete()
      .eq('id', id)

    if (error) throw error

    // Revalidate homepage
    try {
      revalidatePath('/')
      revalidateTag('homepage')
    } catch (revalidateError) {
      console.error('Cache revalidation error:', revalidateError)
    }

    return NextResponse.json({ message: 'Banner deleted successfully' })
  } catch (error: any) {
    console.error('Banner deletion error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete banner' },
      { status: 500 }
    )
  }
}
