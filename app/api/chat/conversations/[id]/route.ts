import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

/**
 * Get conversation with messages
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

    const { id } = params

    // Get conversation
    const { data: conversation, error: convError } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single()

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

    // Mark agent messages as read
    await supabase.rpc('mark_messages_as_read', {
      p_conversation_id: id,
      p_sender_type: 'customer',
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
