import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

/**
 * Get all active hero media items for carousel
 */
export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: heroItems, error } = await supabase
      .from('hero_media')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(heroItems || [])
  } catch (error: any) {
    console.error('Get hero media error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch hero media' },
      { status: 500 }
    )
  }
}

/**
 * Create hero media item (adds to carousel)
 */
export async function POST(request: Request) {
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

    const body = await request.json()

    // Get the highest sort_order to append new item
    const { data: existingItems } = await supabase
      .from('hero_media')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)

    const nextOrder = existingItems && existingItems.length > 0 
      ? (existingItems[0].sort_order || 0) + 1 
      : 0

    // Insert new hero media
    const { error } = await supabase
      .from('hero_media')
      .insert({
        media_type: body.media_type,
        media_url: body.media_url,
        mobile_media_url: body.mobile_media_url || null,
        link_url: body.link_url || null,
        title: body.title || null,
        subtitle: body.subtitle || null,
        show_button: body.show_button !== undefined ? body.show_button : true,
        button_text: body.button_text || 'Shop Now',
        overlay_opacity: body.overlay_opacity !== undefined ? body.overlay_opacity : 30,
        sort_order: body.sort_order !== undefined ? body.sort_order : nextOrder,
        is_active: body.is_active !== undefined ? body.is_active : true
      })

    if (error) throw error

    // Revalidate homepage
    try {
      revalidatePath('/')
      revalidateTag('hero')
    } catch (revalidateError) {
      console.error('Cache revalidation error:', revalidateError)
    }

    return NextResponse.json({ message: 'Hero media created successfully' })
  } catch (error: any) {
    console.error('Hero media create error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create hero media' },
      { status: 500 }
    )
  }
}

/**
 * Update hero media item
 */
export async function PATCH(request: Request) {
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

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'Hero media ID required' }, { status: 400 })
    }

    // Update hero media
    const { error } = await supabase
      .from('hero_media')
      .update(updateData)
      .eq('id', id)

    if (error) throw error

    // Revalidate homepage
    try {
      revalidatePath('/')
      revalidateTag('hero')
    } catch (revalidateError) {
      console.error('Cache revalidation error:', revalidateError)
    }

    return NextResponse.json({ message: 'Hero media updated successfully' })
  } catch (error: any) {
    console.error('Hero media update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update hero media' },
      { status: 500 }
    )
  }
}
