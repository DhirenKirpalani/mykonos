'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Sparkles, Minimize2 } from 'lucide-react'

interface Message {
  id: string
  text: string
  sender: 'user' | 'assistant'
  timestamp: Date
}

export function AssistantWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm your Mykonos shopping assistant. How can I help you find the perfect fragrance today?",
      sender: 'assistant',
      timestamp: new Date(),
    },
  ])
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus()
    }
  }, [isOpen, isMinimized])

  const toggleWidget = () => {
    setIsOpen(!isOpen)
    setIsMinimized(false)
  }

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim()) {
      const userMessage: Message = {
        id: Date.now().toString(),
        text: message,
        sender: 'user',
        timestamp: new Date(),
      }
      setMessages([...messages, userMessage])
      setMessage('')
      
      // Simulate assistant response
      setIsTyping(true)
      setTimeout(() => {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: "Thank you for your message! Our team will get back to you shortly. In the meantime, feel free to browse our collections.",
          sender: 'assistant',
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, assistantMessage])
        setIsTyping(false)
      }, 1500)
    }
  }

  return (
    <>
      {/* Chat Widget */}
      <div
        className={`fixed bottom-20 right-4 z-50 transition-all duration-300 ease-in-out md:bottom-24 md:right-8 ${
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'
        }`}
      >
        <div className={`w-[calc(100vw-2rem)] max-w-[400px] rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 transition-all duration-300 ${
          isMinimized ? 'h-16' : 'h-[500px]'
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between rounded-t-2xl bg-gradient-to-r from-luxury-navy to-luxury-navy/90 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-luxury-gold shadow-lg">
                <Sparkles className="h-5 w-5 text-luxury-navy" />
                <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-green-500 ring-2 ring-white"></div>
              </div>
              <div>
                <h3 className="font-semibold text-white">Mykonos Assistant</h3>
                <p className="text-xs text-luxury-gold">Online • Ready to help</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleMinimize}
                className="rounded-full p-2 transition-all hover:bg-white/10 active:scale-95"
                aria-label={isMinimized ? "Expand chat" : "Minimize chat"}
              >
                <Minimize2 className="h-4 w-4 text-white" />
              </button>
              <button
                onClick={toggleWidget}
                className="rounded-full p-2 transition-all hover:bg-white/10 active:scale-95"
                aria-label="Close chat"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>

          {/* Chat Body */}
          {!isMinimized && (
            <>
              <div className="h-[360px] overflow-y-auto bg-gradient-to-b from-gray-50 to-white p-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm ${
                          msg.sender === 'user'
                            ? 'bg-luxury-gold text-luxury-navy rounded-br-sm'
                            : 'bg-white text-gray-800 rounded-bl-sm ring-1 ring-gray-100'
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                        <p className={`mt-1 text-[10px] ${
                          msg.sender === 'user' ? 'text-luxury-navy/60' : 'text-gray-400'
                        }`}>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-sm ring-1 ring-gray-100">
                        <div className="flex gap-1">
                          <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]"></div>
                          <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]"></div>
                          <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400"></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input */}
              <form onSubmit={handleSubmit} className="border-t border-gray-100 bg-white p-4 rounded-b-2xl">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Ask me anything..."
                    className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm transition-all placeholder:text-gray-400 focus:border-luxury-gold focus:bg-white focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                  />
                  <button
                    type="submit"
                    disabled={!message.trim()}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-luxury-gold shadow-sm transition-all hover:bg-luxury-gold-light hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-luxury-gold"
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4 text-luxury-navy" />
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={toggleWidget}
        className={`group fixed bottom-6 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-black shadow-xl transition-all hover:shadow-2xl hover:bg-black/90 md:bottom-8 md:right-8 md:h-16 md:w-16 ${
          isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100 hover:scale-110'
        } active:scale-95`}
        aria-label="Open chat"
      >
        <div className="relative">
          <MessageCircle className="h-6 w-6 text-white transition-transform group-hover:scale-110 md:h-7 md:w-7" />
          <div className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-green-500 ring-2 ring-black"></div>
        </div>
      </button>
    </>
  )
}
