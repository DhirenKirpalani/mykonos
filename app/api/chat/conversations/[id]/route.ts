import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'
export const dynamic = 'force-dynamic'

/**
 * Get conversation with messages
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { id } = params
    
    // Try to get authenticated user
    const { data: { user } } = await supabase.auth.getUser()

    // Get conversation - allow access for both authenticated users and guests
    let query = supabase
      .from('chat_conversations')
      .select('*')
      .eq('id', id)

    if (user) {
      query = query.eq('user_id', user.id)
    }

    const { data: conversation, error: convError } = await query.single()

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Get messages
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })

    if (messagesError) throw messagesError

    // Mark agent messages as read (for customer viewing)
    // The function marks messages where sender_type != p_sender_type
    // So we pass 'customer' to mark agent messages as read
    await supabase.rpc('mark_messages_as_read', {
      p_conversation_id: id,
      p_sender_type: 'customer', // This will mark agent messages as read
    } as any)

    return NextResponse.json({
      conversation,
      messages: messages || [],
    })
  } catch (error: any) {
    console.error('Conversation fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch conversation' },
      { status: 500 }
    )
  }
}
