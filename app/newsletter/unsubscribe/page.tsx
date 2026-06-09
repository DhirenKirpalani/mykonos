'use client'

import { useState } from 'react'
import { Mail, CheckCircle2, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function UnsubscribePage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!email) {
      setError('Please enter your email address')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/newsletter/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unsubscribe')
      }

      setSuccess(true)
      setEmail('')
    } catch (err: any) {
      setError(err.message || 'Failed to unsubscribe. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="flex justify-center mb-6">
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-full">
              <Mail className="w-8 h-8 text-gray-600 dark:text-gray-400" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
            Unsubscribe from Newsletter
          </h1>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
            We're sorry to see you go. Enter your email address to unsubscribe from our newsletter.
          </p>

          {success ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full">
                  <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Successfully Unsubscribed
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                You have been removed from our newsletter list. You will no longer receive marketing emails from us.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Changed your mind? You can always resubscribe from our website.
              </p>
              <Link
                href="/"
                className="inline-block mt-4 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
              >
                Return to Homepage
              </Link>
            </div>
          ) : (
            <form onSubmit={handleUnsubscribe} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
                  disabled={loading}
                  required
                />
              </div>

              {error && (
                <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Unsubscribing...
                  </>
                ) : (
                  'Unsubscribe'
                )}
              </button>

              <p className="text-xs text-center text-gray-500 dark:text-gray-500">
                By unsubscribing, you will no longer receive promotional emails, product updates, or special offers from MYKONOS.
              </p>
            </form>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
          >
            ← Back to Homepage
          </Link>
        </div>
      </div>
    </div>
  )
}
