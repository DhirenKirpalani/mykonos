'use client'

import { useState } from 'react'
import { MessageCircle, X, Send } from 'lucide-react'

export function AssistantWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')

  const toggleWidget = () => {
    setIsOpen(!isOpen)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim()) {
      // Handle message submission here
      console.log('Message sent:', message)
      setMessage('')
    }
  }

  return (
    <>
      {/* Chat Widget */}
      {isOpen && (
        <div className="fixed bottom-24 right-8 z-50 w-80 md:w-96">
          <div className="rounded-lg bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between rounded-t-lg bg-luxury-navy p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-luxury-gold">
                  <MessageCircle className="h-5 w-5 text-luxury-navy" />
                </div>
                <div>
                  <h3 className="font-medium text-white">Customer Service</h3>
                  <p className="text-xs text-gray-300">We're here to help</p>
                </div>
              </div>
              <button
                onClick={toggleWidget}
                className="rounded-full p-1 transition-colors hover:bg-white/10"
                aria-label="Close chat"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            {/* Chat Body */}
            <div className="h-80 overflow-y-auto p-4">
              <div className="mb-4 rounded-lg bg-gray-100 p-3">
                <p className="text-sm text-gray-800">
                  Hello! How can we assist you today? Feel free to ask about our
                  products, shipping, or any other questions.
                </p>
              </div>
              {/* Messages would appear here */}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-luxury-gold focus:outline-none focus:ring-1 focus:ring-luxury-gold"
                />
                <button
                  type="submit"
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-luxury-gold transition-all hover:bg-luxury-gold-dark active:scale-95"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4 text-luxury-navy" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={toggleWidget}
        className="fixed bottom-8 right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-luxury-gold shadow-lg transition-all hover:scale-110 active:scale-95"
        aria-label="Open chat"
      >
        {isOpen ? (
          <X className="h-6 w-6 text-luxury-navy" />
        ) : (
          <MessageCircle className="h-6 w-6 text-luxury-navy" />
        )}
      </button>
    </>
  )
}
