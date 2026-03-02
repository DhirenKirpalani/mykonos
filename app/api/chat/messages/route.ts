import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/database.types'
export const dynamic = 'force-dynamic'

/**
 * Send chat message
 */
export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const { conversation_id, message_text, sender_name } = body

    if (!conversation_id || !message_text) {
      return NextResponse.json(
        { error: 'Conversation ID and message text required' },
        { status: 400 }
      )
    }

    // Try to get authenticated user
    const { data: { user } } = await supabase.auth.getUser()

    // Verify conversation access
    let query = supabase
      .from('chat_conversations')
      .select('id, user_id, guest_email')
      .eq('id', conversation_id)

    if (user) {
      query = query.eq('user_id', user.id)
    }

    const { data: conversation, error: convError } = await query.single()

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found or access denied' },
        { status: 404 }
      )
    }

    // Send message using database function
    const { data: messageId, error } = await supabase.rpc('send_chat_message', {
      p_conversation_id: conversation_id,
      p_sender_type: 'customer',
      p_sender_id: user?.id || null,
      p_sender_name: sender_name || 'Customer',
      p_message_text: message_text,
    } as any)

    if (error) throw error

    // Fetch the created message
    const { data: message } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('id', messageId)
      .single()

    return NextResponse.json({
      message,
      message_id: messageId,
    })
  } catch (error: any) {
    console.error('Send message error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    )
  }
}
