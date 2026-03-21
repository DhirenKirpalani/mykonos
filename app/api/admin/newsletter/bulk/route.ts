import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    
    if (!supabaseServiceKey) {
      throw new Error('Service role key not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, ids } = body

    if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Action and subscriber IDs are required' },
        { status: 400 }
      )
    }

    if (action === 'delete') {
      const { error } = await supabase
        .from('newsletter_subscriptions')
        .delete()
        .in('id', ids)

      if (error) {
        console.error('Bulk delete error:', error)
        return NextResponse.json(
          { error: 'Failed to delete subscribers' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: `Successfully deleted ${ids.length} subscriber(s)`
      })
    } else if (action === 'unsubscribe') {
      const { error } = await supabase
        .from('newsletter_subscriptions')
        .update({
          is_active: false,
          unsubscribed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in('id', ids)

      if (error) {
        console.error('Bulk unsubscribe error:', error)
        return NextResponse.json(
          { error: 'Failed to unsubscribe subscribers' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: `Successfully unsubscribed ${ids.length} subscriber(s)`
      })
    } else if (action === 'resubscribe') {
      const { error } = await supabase
        .from('newsletter_subscriptions')
        .update({
          is_active: true,
          subscribed_at: new Date().toISOString(),
          unsubscribed_at: null,
          updated_at: new Date().toISOString()
        })
        .in('id', ids)

      if (error) {
        console.error('Bulk resubscribe error:', error)
        return NextResponse.json(
          { error: 'Failed to resubscribe subscribers' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: `Successfully resubscribed ${ids.length} subscriber(s)`
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Bulk action error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to perform bulk action' },
      { status: 500 }
    )
  }
}
