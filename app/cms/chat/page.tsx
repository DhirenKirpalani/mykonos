'use client'

import React, { useState, useEffect, useRef } from 'react'
import { MessageCircle, Send, Search, User, Clock, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useUserRole } from '@/hooks/useUserRole'
import { useRouter } from 'next/navigation'

interface Conversation {
  id: string
  user_id: string | null
  guest_email: string | null
  guest_name: string | null
  order_id: string | null
  subject: string
  status: 'open' | 'closed'
  created_at: string
  updated_at: string
  unread_count?: number
  user?: {
    email: string
    full_name: string | null
  }
}

interface Message {
  id: string
  conversation_id: string
  sender_type: 'customer' | 'agent' | 'system'
  sender_id: string | null
  sender_name: string | null
  message_text: string
  is_read: boolean
  created_at: string
}

export default function ChatManagementPage() {
  const router = useRouter()
  const { role, isLoading: roleLoading } = useUserRole()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const lastMessageTimeRef = useRef<string>(new Date(0).toISOString())
  const selectedConversationIdRef = useRef<string | null>(null)
  const [showConversationList, setShowConversationList] = useState(true)

  useEffect(() => {
    if (!roleLoading && role !== 'admin') {
      router.push('/cms')
      toast.error('Access denied. Admin role required.')
    }
  }, [role, roleLoading, router])

  useEffect(() => {
    if (role === 'admin') {
      fetchConversations()
      getCurrentUser()
    }
  }, [role])

  // Keep ref in sync with state so effects with stale closures can read it
  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId
  }, [selectedConversationId])

  useEffect(() => {
    if (selectedConversationId) {
      // Persist so hard refresh restores the same conversation
      sessionStorage.setItem('cms_selected_conv', selectedConversationId)
      // Clear messages immediately to prevent showing old conversation
      setMessages([])
      lastMessageTimeRef.current = new Date(0).toISOString()
      fetchMessages(selectedConversationId)
    }
  }, [selectedConversationId])

  // Update ref when messages change
  useEffect(() => {
    if (messages.length > 0) {
      lastMessageTimeRef.current = messages[messages.length - 1].created_at
    }
  }, [messages])

  // Subscribe to real-time message updates (new messages and read status changes)
  useEffect(() => {
    if (!selectedConversationId) return
    
    const channel = supabase
      .channel(`messages:${selectedConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${selectedConversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message
          setMessages(prev => {
            // Check if this is a real message replacing an optimistic one
            const hasOptimistic = prev.some(m => m.id && typeof m.id === 'string' && m.id.startsWith('temp-'))
            
            // If we already have this exact message ID, don't add it again
            if (prev.some(m => m.id === newMessage.id)) return prev
            
            // If we have an optimistic message and this is from the agent, replace it
            if (hasOptimistic && newMessage.sender_type === 'agent') {
              return prev.map(m => (m.id && typeof m.id === 'string' && m.id.startsWith('temp-')) ? newMessage : m)
            }
            
            // Otherwise, just add the new message
            return [...prev, newMessage]
          })
          
          // Mark new customer messages as read
          if (newMessage.sender_type === 'customer' && !newMessage.is_read) {
            (supabase
              .from('chat_messages') as any)
              .update({ is_read: true })
              .eq('id', newMessage.id)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${selectedConversationId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as Message
          setMessages(prev => prev.map(m => 
            m.id === updatedMessage.id ? updatedMessage : m
          ))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedConversationId])

  // Subscribe to message inserts/updates to keep sidebar unread counts live
  useEffect(() => {
    if (role !== 'admin') return

    const channel = supabase
      .channel('message-read-status')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const newMessage = payload.new as Message
          // Skip increment when the admin is already viewing this conversation
          if (newMessage.sender_type === 'customer' && !newMessage.is_read &&
              newMessage.conversation_id !== selectedConversationIdRef.current) {
            setConversations(prev => {
              const updated = prev.map(conv => {
                if (conv.id === newMessage.conversation_id) {
                  return { ...conv, unread_count: (conv.unread_count || 0) + 1 }
                }
                return conv
              })
              // Bubble the updated conversation to the top
              const idx = updated.findIndex(c => c.id === newMessage.conversation_id)
              if (idx > 0) {
                const [conv] = updated.splice(idx, 1)
                return [conv, ...updated]
              }
              return updated
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const updatedMessage = payload.new as Message
          // If a message was marked as read, decrement the conversation's unread count
          if (updatedMessage.is_read && updatedMessage.sender_type === 'customer') {
            setConversations(prev => prev.map(conv => {
              if (conv.id === updatedMessage.conversation_id) {
                const newCount = Math.max(0, (conv.unread_count || 0) - 1)
                return { ...conv, unread_count: newCount }
              }
              return conv
            }))
            window.dispatchEvent(new CustomEvent('chat-messages-read'))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [role])

  // Refresh conversation list every 30 seconds
  useEffect(() => {
    if (role !== 'admin') return

    const refreshInterval = setInterval(() => {
      fetchConversations(true)
    }, 30000)

    return () => clearInterval(refreshInterval)
  }, [role])

  // Check if user is at bottom of scroll
  const checkIfAtBottom = () => {
    const container = messagesContainerRef.current
    if (!container) return true
    
    const threshold = 100
    const isBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold
    setIsAtBottom(isBottom)
  }

  // Only auto-scroll if user is at bottom
  useEffect(() => {
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isAtBottom])

  const getCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()
      setCurrentUser(userData)
    }
  }

  const fetchConversations = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error

      const conversationsWithUnread = await Promise.all(
        (data || []).map(async (conv: any) => {
          const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('sender_type', 'customer')
            .eq('is_read', false)

          // Fetch user data separately if user_id exists
          let userData = null
          if (conv.user_id) {
            const { data: user } = await supabase
              .from('users')
              .select('email,first_name,last_name')
              .eq('id', conv.user_id)
              .single()
            userData = user
          }

          return {
            ...conv,
            user: userData,
            unread_count: count || 0,
          }
        })
      )

      setConversations(conversationsWithUnread as Conversation[])

      // Restore previously selected conversation after refresh
      const savedId = sessionStorage.getItem('cms_selected_conv')
      if (savedId && !selectedConversationId) {
        const saved = (conversationsWithUnread as Conversation[]).find(c => c.id === savedId)
        if (saved) {
          setSelectedConversation(saved)
          setSelectedConversationId(saved.id)
        }
      }
      
      // Log conversations with unread messages
      const unreadConvs = conversationsWithUnread.filter((c: any) => c.unread_count > 0)
      if (unreadConvs.length > 0) {
        console.log(`[Chat] Found ${unreadConvs.length} conversations with unread messages:`)
        unreadConvs.forEach((c: any) => {
          console.log(`  - ${c.subject} (ID: ${c.id.slice(0, 8)}...): ${c.unread_count} unread`)
        })
        const totalUnread = unreadConvs.reduce((sum: number, c: any) => sum + c.unread_count, 0)
        console.log(`[Chat] Total unread messages across all conversations: ${totalUnread}`)
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
      if (!silent) toast.error('Failed to load conversations')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const fetchMessages = async (conversationId: string) => {
    try {
      // Update unread count immediately (optimistic update)
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
      ))
      
      if (selectedConversation) {
        setSelectedConversation({ ...selectedConversation, unread_count: 0 })
      }

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Log message read status
      const customerMessages = (data || []).filter((m: any) => m.sender_type === 'customer')
      const unreadCustomerMessages = customerMessages.filter((m: any) => !m.is_read)
      console.log(`[Chat] Conversation ${conversationId.slice(0, 8)}... has ${customerMessages.length} customer messages, ${unreadCustomerMessages.length} unread`)
      if (unreadCustomerMessages.length > 0) {
        console.log('[Chat] Unread message IDs:', unreadCustomerMessages.map((m: any) => m.id.slice(0, 8)).join(', '))
      }

      setMessages(data || [])

      // Mark messages as read in background
      console.log(`[Chat] Attempting to mark unread customer messages as read in conversation ${conversationId.slice(0, 8)}...`)
      const { data: updatedMessages, error: updateError } = await (supabase
        .from('chat_messages') as any)
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .eq('sender_type', 'customer')
        .eq('is_read', false)
        .select()
      
      if (updateError) {
        console.error('[Chat] Failed to mark messages as read:', updateError)
      } else {
        console.log(`[Chat] Successfully marked ${updatedMessages?.length || 0} messages as read`)
        if (updatedMessages && updatedMessages.length > 0) {
          console.log('[Chat] Updated message IDs:', updatedMessages.map((m: any) => m.id.slice(0, 8)).join(', '))
        }
      }
      
      // Small delay to ensure DB update propagates
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Refetch the conversation's unread count to ensure accuracy
      const { count: newUnreadCount } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
        .eq('sender_type', 'customer')
        .eq('is_read', false)
      
      // Update conversation with accurate unread count
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId ? { ...conv, unread_count: newUnreadCount || 0 } : conv
      ))
      
      // Trigger a custom event to update the sidebar badge
      console.log('Firing chat-messages-read event')
      window.dispatchEvent(new CustomEvent('chat-messages-read'))
    } catch (error) {
      console.error('Failed to fetch messages:', error)
      toast.error('Failed to load messages')
    }
  }

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || sending) return

    setSending(true)
    const messageText = messageInput
    setMessageInput('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Please login to send messages')
        return
      }

      // Create optimistic message to show immediately
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: selectedConversation.id,
        sender_type: 'agent',
        sender_id: session.user.id,
        sender_name: currentUser?.full_name || currentUser?.email || 'Support Agent',
        message_text: messageText,
        is_read: true,
        created_at: new Date().toISOString(),
      }

      // Add optimistic message immediately
      setMessages(prev => [...prev, optimisticMessage])

      const { error } = await supabase.rpc('send_chat_message', {
        p_conversation_id: selectedConversation.id,
        p_sender_type: 'agent',
        p_sender_id: session.user.id,
        p_sender_name: currentUser?.full_name || currentUser?.email || 'Support Agent',
        p_message_text: messageText,
      } as any)

      if (error) throw error

      // The Realtime INSERT event will replace the optimistic message with the real one

      await (supabase
        .from('chat_conversations') as any)
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedConversation.id)

      // Update conversation in list without full refetch
      setConversations(prev => prev.map(conv => 
        conv.id === selectedConversation.id 
          ? { ...conv, updated_at: new Date().toISOString() } 
          : conv
      ))
    } catch (error) {
      console.error('Failed to send message:', error)
      toast.error('Failed to send message')
      setMessageInput(messageText)
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => !(m.id && typeof m.id === 'string' && m.id.startsWith('temp-'))))
    } finally {
      setSending(false)
    }
  }


  const filteredConversations = React.useMemo(() => {
    return conversations.filter((conv) => {
      const searchLower = searchQuery.toLowerCase()
      return (
        conv.subject.toLowerCase().includes(searchLower) ||
        conv.guest_email?.toLowerCase().includes(searchLower) ||
        conv.guest_name?.toLowerCase().includes(searchLower) ||
        (conv.user as any)?.email?.toLowerCase().includes(searchLower)
      )
    })
  }, [conversations, searchQuery])

  if (roleLoading || role !== 'admin') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-lg">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50 relative">
      {/* Conversations List */}
      <div className={`${showConversationList ? 'block' : 'hidden'} md:block w-full md:w-80 border-r border-gray-200 bg-white absolute md:relative inset-0 z-10 md:z-0`}>
        <div className="border-b border-gray-200 p-3 md:p-4">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h1 className="text-lg md:text-xl font-semibold text-gray-900">Support Chat</h1>
            <button
              onClick={() => setShowConversationList(false)}
              className="md:hidden rounded p-1 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-1.5 md:py-2 pl-9 md:pl-10 pr-3 md:pr-4 text-xs md:text-sm focus:border-luxury-gold focus:outline-none focus:ring-1 focus:ring-luxury-gold"
            />
          </div>
        </div>

        <div className="overflow-y-auto" style={{ height: 'calc(100% - 140px)' }}>
          {loading ? (
            <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">No conversations found</div>
          ) : (
            filteredConversations.map((conv) => {
              const user = conv.user as any
              const displayName = (user?.first_name && user?.last_name 
                                    ? `${user.first_name} ${user.last_name}`
                                    : null) ||
                                  user?.email || 
                                  conv.guest_name || 
                                  conv.guest_email || 
                                  'Guest User'
              
              return (
                <button
                  key={conv.id}
                  onClick={() => {
                    // Immediately reset unread count for this conversation
                    setConversations(prev => prev.map(c => 
                      c.id === conv.id ? { ...c, unread_count: 0 } : c
                    ))
                    setSelectedConversation({ ...conv, unread_count: 0 })
                    setSelectedConversationId(conv.id)
                    setShowConversationList(false) // Hide list on mobile when conversation selected
                  }}
                  className={`w-full border-b border-gray-100 p-3 md:p-4 text-left transition-colors hover:bg-gray-50 ${
                    selectedConversation?.id === conv.id ? 'bg-luxury-gold/10' : ''
                  }`}
                >
                  <div className="mb-1 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3 md:h-4 md:w-4 text-gray-400 flex-shrink-0" />
                      <span className="font-medium text-gray-900 text-sm md:text-base truncate">
                        {displayName}
                      </span>
                    </div>
                    {(conv.unread_count || 0) > 0 && selectedConversationId !== conv.id && (
                      <span className="rounded-full bg-luxury-gold px-2 py-0.5 text-xs font-medium text-luxury-navy">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                <div className="mb-1 text-xs md:text-sm text-gray-600 truncate">{conv.subject}</div>
                <div className="flex items-center gap-1 md:gap-2 text-xs text-gray-400">
                  <Clock className="h-3 w-3" />
                  {new Date(conv.updated_at).toLocaleString()}
                </div>
              </button>
            )
            })
          )}
        </div>
      </div>

      {/* Messages Panel */}
      <div className="flex flex-1 flex-col w-full">
        {selectedConversation ? (
          <>
            {/* Header */}
            <div className="border-b border-gray-200 bg-white p-3 md:p-4">
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => setShowConversationList(true)}
                  className="md:hidden rounded p-1 hover:bg-gray-100 flex-shrink-0"
                >
                  <MessageCircle className="h-5 w-5" />
                </button>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-gray-900 text-sm md:text-base truncate">
                    {((selectedConversation.user as any)?.first_name && (selectedConversation.user as any)?.last_name 
                        ? `${(selectedConversation.user as any).first_name} ${(selectedConversation.user as any).last_name}`
                        : null) ||
                      (selectedConversation.user as any)?.email ||
                      selectedConversation.guest_name ||
                      selectedConversation.guest_email ||
                      'Guest User'}
                  </h2>
                  <p className="text-xs md:text-sm text-gray-500 truncate">{selectedConversation.subject}</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div 
              ref={messagesContainerRef}
              onScroll={checkIfAtBottom}
              className="flex-1 overflow-y-auto bg-gray-50 p-3 md:p-4" 
              style={{ maxHeight: 'calc(100vh - 250px)' }}
            >
              <div className="flex flex-col">
                {(() => {
                  const formatMessageDate = (dateString: string) => {
                    const date = new Date(dateString)
                    if (isNaN(date.getTime())) {
                      return 'Today'
                    }
                    const today = new Date()
                    const yesterday = new Date(today)
                    yesterday.setDate(yesterday.getDate() - 1)

                    if (date.toDateString() === today.toDateString()) {
                      return 'Today'
                    } else if (date.toDateString() === yesterday.toDateString()) {
                      return 'Yesterday'
                    } else {
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    }
                  }

                  const groupMessagesByDate = (messages: Message[]) => {
                    const groups: { [key: string]: Message[] } = {}
                    messages.forEach(msg => {
                      const date = new Date(msg.created_at)
                      const dateKey = isNaN(date.getTime()) ? new Date().toDateString() : date.toDateString()
                      if (!groups[dateKey]) {
                        groups[dateKey] = []
                      }
                      groups[dateKey].push(msg)
                    })
                    return groups
                  }

                  return Object.entries(groupMessagesByDate(messages)).map(([dateKey, dateMessages]) => (
                    <div key={dateKey} className="mb-4">
                      <div className="flex justify-center my-3 md:my-4">
                        <span className="rounded-full bg-gray-300 px-2 md:px-3 py-0.5 md:py-1 text-xs text-gray-700 font-medium">
                          {formatMessageDate(dateMessages[0].created_at)}
                        </span>
                      </div>
                      {dateMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex mb-2 md:mb-3 ${
                      message.sender_type === 'agent' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] md:max-w-[70%] rounded-lg px-3 md:px-4 py-2 text-sm md:text-base ${
                        message.sender_type === 'agent'
                          ? 'bg-luxury-gold text-luxury-navy'
                          : message.sender_type === 'customer'
                          ? 'bg-white text-gray-900'
                          : 'bg-blue-50 text-blue-900'
                      }`}
                    >
                      {message.sender_type !== 'agent' && (
                        <p className="mb-1 text-xs font-semibold">
                          {message.sender_name || 
                           ((selectedConversation.user as any)?.first_name && (selectedConversation.user as any)?.last_name 
                             ? `${(selectedConversation.user as any).first_name} ${(selectedConversation.user as any).last_name}`
                             : null) ||
                           (selectedConversation.user as any)?.email ||
                           selectedConversation.guest_name || 
                           selectedConversation.guest_email ||
                           'Guest User'}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap text-sm">{message.message_text}</p>
                      <div className="mt-1 flex items-center gap-1 text-xs">
                        <span className="opacity-70">
                          {(() => {
                            const date = new Date(message.created_at)
                            if (isNaN(date.getTime())) {
                              return new Date().toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            }
                            return date.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          })()}
                        </span>
                        {message.sender_type === 'agent' && (
                          <span className="font-bold" style={{ color: message.is_read ? '#3b82f6' : '#9ca3af' }}>
                            {message.is_read ? '✓✓' : '✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                      ))}
                    </div>
                  ))
                })()}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 bg-white p-3 md:p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  placeholder="Type your message..."
                  disabled={sending}
                  className="flex-1 rounded-lg border border-gray-300 px-3 md:px-4 py-2 text-sm md:text-base focus:border-luxury-gold focus:outline-none focus:ring-1 focus:ring-luxury-gold disabled:bg-gray-100 disabled:opacity-50"
                />
                <button
                  onClick={sendMessage}
                  disabled={!messageInput.trim() || sending}
                  className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-lg bg-luxury-gold text-luxury-navy transition-all hover:bg-luxury-gold/90 disabled:cursor-not-allowed disabled:opacity-50 flex-shrink-0"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageCircle className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p>Select a conversation to view messages</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
