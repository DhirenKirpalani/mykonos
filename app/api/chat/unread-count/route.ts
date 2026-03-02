import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Get total unread message count across all conversations
 */
export async function GET() {
  try {
    const supabase = createClient()
    
    // Get total count of unread customer messages across all conversations
    const { count, error } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_type', 'customer')
      .eq('is_read', false)

    if (error) throw error

    return NextResponse.json({ count: count || 0 })
  } catch (error: any) {
    console.error('Unread count fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch unread count', count: 0 },
      { status: 500 }
    )
  }
}
