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
  is_read: boolean
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
  const [isAgentOnline, setIsAgentOnline] = useState(true)
  const [userName, setUserName] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Reset state when widget is closed
  useEffect(() => {
    if (!isOpen) {
      setConversationId(null)
      setMessages([])
      setInputMessage('')
    }
  }, [isOpen])

  // Check for online agents
  useEffect(() => {
    const checkAgentStatus = async () => {
      try {
        const response = await fetch('/api/chat/agent-status', {
          credentials: 'include'
        })
        if (response.ok) {
          const { isOnline } = await response.json()
          setIsAgentOnline(isOnline)
        }
      } catch (error) {
        console.error('Failed to check agent status:', error)
      }
    }

    checkAgentStatus()
    const interval = setInterval(checkAgentStatus, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [])

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

  // Fetch user's name
  useEffect(() => {
    const fetchUserName = async () => {
      if (user && !user.is_anonymous) {
        try {
          const { supabase } = await import('@/lib/supabase/client')
          const { data } = await supabase
            .from('users')
            .select('first_name, last_name, email')
            .eq('id', user.id)
            .single()
          
          if (data) {
            const userData = data as { first_name: string; last_name: string; email: string }
            const name = userData.first_name && userData.last_name 
              ? `${userData.first_name} ${userData.last_name}`
              : userData.email
            setUserName(name)
          }
        } catch (error) {
          console.error('Failed to fetch user name:', error)
        }
      }
    }
    
    fetchUserName()
  }, [user])

  // Poll for new messages every 3 seconds
  useEffect(() => {
    if (!isOpen || !conversationId) return

    const pollInterval = setInterval(async () => {
      try {
        setMessages(currentMessages => {
          const lastMessageTime = currentMessages.length > 0 
            ? currentMessages[currentMessages.length - 1].created_at 
            : new Date(0).toISOString()

          fetch(`/api/chat/conversations/${conversationId}`, {
            credentials: 'include'
          })
            .then(response => response.json())
            .then(({ messages: allMessages, conversation }) => {
              // Check if conversation was closed
              if (conversation && conversation.status === 'closed') {
                toast.info('This conversation has been closed by our support team.')
                setIsOpen(false)
                setConversationId(null)
                setMessages([])
                return
              }
              
              // Only update if there are new messages
              const newMessages = allMessages.filter((msg: Message) => 
                msg.created_at > lastMessageTime
              )
              
              if (newMessages.length > 0) {
                setMessages(prev => {
                  const existingIds = new Set(prev.map(m => m.id))
                  const uniqueNew = newMessages.filter((m: Message) => !existingIds.has(m.id))
                  return uniqueNew.length > 0 ? [...prev, ...uniqueNew] : prev
                })
              }
            })
            .catch(error => {
              console.error('Failed to poll messages:', error)
            })

          return currentMessages
        })
      } catch (error) {
        console.error('Failed to poll messages:', error)
      }
    }, 3000)

    return () => clearInterval(pollInterval)
  }, [isOpen, conversationId])

  const loadOrCreateConversation = async () => {
    setIsLoading(true)
    try {
      // For authenticated users, try to load existing open conversation
      if (user) {
        const response = await fetch('/api/chat/conversations?status=open', {
          credentials: 'include'
        })
        
        if (response.ok) {
          const { conversations } = await response.json()
          
          if (conversations && conversations.length > 0) {
            // Use existing conversation
            const conv = conversations[0]
            setConversationId(conv.id)
            await loadMessages(conv.id)
            return
          }
        }
      }
      
      // Create new conversation (for both authenticated and guest users)
      await createConversation()
    } catch (error) {
      console.error('Failed to load conversation:', error)
      toast.error('Failed to start chat')
    } finally {
      setIsLoading(false)
    }
  }

  const createConversation = async () => {
    try {
      const payload: any = {
        order_id: orderId || null,
        subject: orderNumber ? `Order ${orderNumber}` : 'General Inquiry',
        initial_message: 'Hello, I need help.',
      }
      
      // Only add guest credentials if user is not authenticated
      if (!user || user.is_anonymous) {
        payload.guest_email = 'guest@mykonos.com'
        payload.guest_name = 'Guest User'
      }
      
      console.log('[LiveChat] Creating conversation with payload:', payload, 'user:', user?.id)
      
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('[LiveChat] Server error:', errorData)
        throw new Error('Failed to create conversation')
      }

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
      const response = await fetch(`/api/chat/conversations/${convId}`, {
        credentials: 'include'
      })
      
      if (!response.ok) {
        console.error('Failed to load messages:', response.status)
        return
      }
      
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
        credentials: 'include',
        body: JSON.stringify({
          conversation_id: conversationId,
          message_text: messageText,
          sender_name: userName || user?.email || 'Guest User',
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
        className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-luxury-gold shadow-lg transition-all hover:scale-110 hover:shadow-xl sm:bottom-6 sm:right-6 sm:h-14 sm:w-14"
        aria-label="Open live chat"
      >
        <MessageCircle className="h-5 w-5 text-luxury-navy sm:h-6 sm:w-6" />
      </button>
    )
  }

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-md flex-col rounded-lg bg-white shadow-2xl transition-all sm:bottom-6 sm:right-6 sm:w-96 ${
        isMinimized ? 'h-14' : 'h-[500px] sm:h-[600px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-lg bg-luxury-navy px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-luxury-gold/20">
            <MessageCircle className="h-4 w-4 text-luxury-gold sm:h-5 sm:w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white sm:text-base">Mykonos Assistant</h3>
            <p className="text-xs text-luxury-gold/80">
              {isAgentOnline ? (
                <>
                  <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                  Online • Ready to help
                </>
              ) : (
                <>
                  <span className="inline-block w-2 h-2 bg-gray-400 rounded-full mr-1"></span>
                  Offline • We'll respond soon
                </>
              )}
            </p>
          </div>
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
          <div className="flex-1 overflow-y-auto p-3 space-y-3 sm:p-4">
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
                        Mykonos Support
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{message.message_text}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <p className="text-xs opacity-70">
                        {new Date(message.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      {message.sender_type === 'customer' && (
                        <span className="text-xs font-bold" style={{ color: message.is_read ? '#3b82f6' : '#9ca3af' }}>
                          {message.is_read ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-3 sm:p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                disabled={isSending || !conversationId}
                className="flex-1 resize-none rounded-full border border-gray-300 px-4 py-2.5 text-sm focus:border-luxury-gold focus:outline-none focus:ring-1 focus:ring-luxury-gold disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isSending || !conversationId}
                className="flex h-10 w-10 items-center justify-center self-center rounded-full bg-luxury-gold text-luxury-navy transition-all hover:bg-luxury-gold/90 disabled:cursor-not-allowed disabled:opacity-50"
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
