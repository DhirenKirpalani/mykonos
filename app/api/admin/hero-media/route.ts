import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

/**
 * Create hero media (deactivates previous and sets new as active)
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

    // Deactivate all existing hero media
    await supabase
      .from('hero_media')
      .update({ is_active: false })
      .eq('is_active', true)

    // Insert new hero media
    const { error } = await supabase
      .from('hero_media')
      .insert({
        media_type: body.media_type,
        media_url: body.media_url,
        is_active: true
      })

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
