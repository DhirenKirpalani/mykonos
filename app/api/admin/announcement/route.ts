import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { verifyAdminAuth } from '@/lib/auth/admin-auth'

export const dynamic = 'force-dynamic'

/**
 * Create announcement message
 */
export async function POST(request: Request) {
  try {
    const auth = await verifyAdminAuth(request)
    if (!auth.ok) return auth.response

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await request.json()

    const { error } = await supabase
      .from('announcement_messages')
      .insert({
        message: body.message,
        display_order: body.display_order,
        is_active: body.is_active ?? true
      })

    if (error) throw error

    // Revalidate pages that show announcements
    try {
      revalidatePath('/')
      revalidateTag('announcement')
    } catch (revalidateError) {
      console.error('Cache revalidation error:', revalidateError)
    }

    return NextResponse.json({ message: 'Announcement created successfully' })
  } catch (error: any) {
    console.error('Announcement creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create announcement' },
      { status: 500 }
    )
  }
}
