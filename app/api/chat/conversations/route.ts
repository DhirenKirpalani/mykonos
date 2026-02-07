import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

/**
 * Get user's chat conversations
 */
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('chat_conversations')
      .select('*')
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: conversations, error } = await query

    if (error) throw error

    // Get unread message counts for each conversation
    const conversationsWithUnread = await Promise.all(
      (conversations || []).map(async (conv) => {
        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', (conv as any).id)
          .eq('sender_type', 'agent')
          .eq('is_read', false)

        return {
          ...(conv as any),
          unread_count: count || 0,
        }
      })
    )

    return NextResponse.json({
      conversations: conversationsWithUnread,
    })
  } catch (error: any) {
    console.error('Chat conversations fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}

/**
 * Create new chat conversation
 */
export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

    const { data: { session } } = await supabase.auth.getSession()
    const body = await request.json()
    const { order_id, subject, initial_message, guest_email, guest_name } = body

    let userId = session?.user?.id || null
    let guestEmail = guest_email || null
    let guestName = guest_name || null

    // Require either authenticated user or guest info
    if (!userId && (!guestEmail || !guestName)) {
      return NextResponse.json(
        { error: 'User authentication or guest information required' },
        { status: 400 }
      )
    }

    // Create conversation using database function
    const { data: conversationId, error } = await supabase.rpc('create_chat_conversation', {
      p_user_id: userId,
      p_guest_email: guestEmail,
      p_guest_name: guestName,
      p_order_id: order_id || null,
      p_subject: subject || 'Customer Support',
      p_initial_message: initial_message || null,
    } as any)

    if (error) throw error

    // Fetch the created conversation
    const { data: conversation } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('id', conversationId)
      .single()

    return NextResponse.json({
      conversation,
      conversation_id: conversationId,
    })
  } catch (error: any) {
    console.error('Create conversation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create conversation' },
      { status: 500 }
    )
  }
}
