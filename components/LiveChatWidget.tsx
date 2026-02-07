'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send, Minimize2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

interface Message {
  id: string
  sender_type: 'customer' | 'agent' | 'system'
  sender_name: string | null
  message_text: string
  created_at: string
}

interface LiveChatWidgetProps {
  orderId?: string
  orderNumber?: string
}

export function LiveChatWidget({ orderId, orderNumber }: LiveChatWidgetProps) {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load existing conversation or create new one
  useEffect(() => {
    if (isOpen && !conversationId) {
      loadOrCreateConversation()
    }
  }, [isOpen])

  const loadOrCreateConversation = async () => {
    setIsLoading(true)
    try {
      // Try to load existing open conversation
      const response = await fetch('/api/chat/conversations?status=open')
      const { conversations } = await response.json()

      if (conversations && conversations.length > 0) {
        // Use existing conversation
        const conv = conversations[0]
        setConversationId(conv.id)
        await loadMessages(conv.id)
      } else {
        // Create new conversation
        await createConversation()
      }
    } catch (error) {
      console.error('Failed to load conversation:', error)
      toast.error('Failed to start chat')
    } finally {
      setIsLoading(false)
    }
  }

  const createConversation = async () => {
    try {
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          subject: orderNumber ? `Order ${orderNumber}` : 'Customer Support',
          initial_message: 'Hello, I need help.',
        }),
      })

      const { conversation_id } = await response.json()
      setConversationId(conversation_id)
      await loadMessages(conversation_id)
    } catch (error) {
      console.error('Failed to create conversation:', error)
      toast.error('Failed to start chat')
    }
  }

  const loadMessages = async (convId: string) => {
    try {
      const response = await fetch(`/api/chat/conversations/${convId}`)
      const { messages: loadedMessages } = await response.json()
      setMessages(loadedMessages || [])
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || !conversationId || isSending) return

    setIsSending(true)
    const messageText = inputMessage
    setInputMessage('')

    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          message_text: messageText,
          sender_name: user?.email || 'Customer',
        }),
      })

      const { message } = await response.json()
      setMessages((prev) => [...prev, message])
    } catch (error) {
      console.error('Failed to send message:', error)
      toast.error('Failed to send message')
      setInputMessage(messageText) // Restore message on error
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-luxury-gold shadow-lg transition-all hover:scale-110 hover:shadow-xl"
        aria-label="Open live chat"
      >
        <MessageCircle className="h-6 w-6 text-luxury-navy" />
      </button>
    )
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex w-96 flex-col rounded-lg bg-white shadow-2xl transition-all ${
        isMinimized ? 'h-14' : 'h-[600px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-lg bg-luxury-navy px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-luxury-gold" />
          <h3 className="font-semibold text-white">Live Chat Support</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="rounded p-1 text-white transition-colors hover:bg-white/10"
            aria-label={isMinimized ? 'Maximize' : 'Minimize'}
          >
            <Minimize2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded p-1 text-white transition-colors hover:bg-white/10"
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-muted-foreground">Loading chat...</div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-muted-foreground">
                  <p>Welcome to customer support!</p>
                  <p className="text-sm mt-2">How can we help you today?</p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender_type === 'customer' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.sender_type === 'customer'
                        ? 'bg-luxury-gold text-luxury-navy'
                        : message.sender_type === 'agent'
                        ? 'bg-gray-100 text-gray-900'
                        : 'bg-blue-50 text-blue-900'
                    }`}
                  >
                    {message.sender_type !== 'customer' && (
                      <p className="text-xs font-semibold mb-1">
                        {message.sender_name || 'Support Agent'}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{message.message_text}</p>
                    <p className="text-xs mt-1 opacity-70">
                      {new Date(message.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-2">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={isSending || !conversationId}
                rows={2}
                className="flex-1 resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-luxury-gold focus:outline-none focus:ring-1 focus:ring-luxury-gold disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isSending || !conversationId}
                className="flex h-10 w-10 items-center justify-center self-end rounded-md bg-luxury-gold text-luxury-navy transition-all hover:bg-luxury-gold-light disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
