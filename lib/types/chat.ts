// Live chat types

export type ChatStatus = 'open' | 'assigned' | 'resolved' | 'closed'
export type SenderType = 'customer' | 'agent' | 'system'

export interface ChatConversation {
  id: string
  user_id: string | null
  guest_email: string | null
  guest_name: string | null
  order_id: string | null
  order_number: string | null
  status: ChatStatus
  assigned_to: string | null
  subject: string | null
  created_at: string
  updated_at: string
  closed_at: string | null
}

export interface ChatMessage {
  id: string
  conversation_id: string
  sender_type: SenderType
  sender_id: string | null
  sender_name: string | null
  message_text: string
  is_read: boolean
  created_at: string
}

export interface ChatAttachment {
  id: string
  message_id: string
  file_name: string
  file_url: string
  file_type: string | null
  file_size: number | null
  created_at: string
}

export interface ChatConversationWithMessages extends ChatConversation {
  messages: ChatMessage[]
  unread_count?: number
}

export interface CreateConversationParams {
  user_id?: string
  guest_email?: string
  guest_name?: string
  order_id?: string
  subject?: string
  initial_message?: string
}

export interface SendMessageParams {
  conversation_id: string
  sender_type: SenderType
  sender_id?: string
  sender_name?: string
  message_text: string
}
