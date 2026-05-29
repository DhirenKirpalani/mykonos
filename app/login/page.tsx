'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ForgotPasswordModal } from '@/components/ForgotPasswordModal'
import { useLanguage } from '@/contexts/LanguageContext'

export default function LoginPage() {
  const { t, locale } = useLanguage()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null)
  const router = useRouter()

  // Pre-fill email from track order page or remembered credentials
  useEffect(() => {
    // Check for redirect parameter in URL
    const params = new URLSearchParams(window.location.search)
    const redirect = params.get('redirect')
    if (redirect) {
      setRedirectUrl(decodeURIComponent(redirect))
    }
    
    // First check for signin context from track order
    const signinContext = sessionStorage.getItem('signinContext')
    if (signinContext) {
      try {
        const { email: savedEmail } = JSON.parse(signinContext)
        if (savedEmail) {
          setEmail(savedEmail)
        }
      } catch (error) {
        console.error('Error parsing signin context:', error)
      }
    }
    
    // Then check for remembered credentials
    const rememberedEmail = localStorage.getItem('rememberedEmail')
    if (rememberedEmail && !signinContext) {
      setEmail(rememberedEmail)
      setRememberMe(true)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Get anonymous user ID before login (if exists)
      const { data: { session: anonSession } } = await supabase.auth.getSession()
      const anonymousUserId = anonSession?.user?.is_anonymous ? anonSession.user.id : null

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Merge anonymous cart to logged-in user
      if (anonymousUserId && data.user) {
        try {
          await supabase.rpc('merge_anonymous_cart_to_user', {
            p_anonymous_user_id: anonymousUserId,
            p_logged_in_user_id: data.user.id
          } as any)
          
          await supabase.rpc('merge_anonymous_wishlist_to_user', {
            p_anonymous_user_id: anonymousUserId,
            p_logged_in_user_id: data.user.id
          } as any)
          
          // Clear anonymous user_id and cached cart from localStorage after merge
          localStorage.removeItem('anonymous_user_id')
          localStorage.removeItem('cached_cart')
        } catch (mergeError) {
          console.error('Cart merge error:', mergeError)
          // Don't block login if merge fails
        }
      } else {
        // No anonymous cart to merge, just clear cached cart
        localStorage.removeItem('cached_cart')
      }

      // Handle Remember Me
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email)
      } else {
        localStorage.removeItem('rememberedEmail')
      }

      toast.success(t.auth.loginSuccess, {
        description: t.auth.loginSuccessDesc,
      })
      
      // Redirect to original page if redirect parameter exists, otherwise go to account
      if (redirectUrl) {
        router.push(redirectUrl)
      } else {
        router.push('/account')
      }
    } catch (error: any) {
      // Translate common Supabase error messages
      let errorDescription = t.auth.loginFailedDesc
      
      if (error.message) {
        const errorMsg = error.message.toLowerCase()
        if (errorMsg.includes('email') && errorMsg.includes('phone')) {
          errorDescription = locale === 'id' ? 'Email atau nomor telepon tidak boleh kosong' : 'Email or phone number is required'
        } else if (errorMsg.includes('invalid') && errorMsg.includes('credentials')) {
          errorDescription = locale === 'id' ? 'Email atau kata sandi salah' : 'Invalid email or password'
        } else if (errorMsg.includes('email not confirmed')) {
          errorDescription = locale === 'id' ? 'Silakan konfirmasi email Anda terlebih dahulu' : 'Please confirm your email first'
        } else {
          // For other errors, use the original message only if it's not a generic Supabase error
          errorDescription = error.message
        }
      }
      
      toast.error(t.auth.loginFailed, {
        description: errorDescription
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-luxury-gray-light py-12">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="mx-auto max-w-md">
          <div className="rounded-lg bg-white p-8 shadow-lg">
            <div className="mb-8 text-center">
              <h1 className="mb-2 font-montserrat text-3xl font-bold">{t.auth.welcomeBack}</h1>
              <p className="text-sm text-muted-foreground">
                {t.auth.signInSubtitle}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium">
                  {t.auth.emailAddress}
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-4 py-3 text-sm focus:border-luxury-gold focus:outline-none focus:ring-1 focus:ring-luxury-gold"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium">
                    {t.auth.password}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-luxury-gold hover:underline"
                  >
                    {t.auth.forgotPassword}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-4 py-3 pr-12 text-sm focus:border-luxury-gold focus:outline-none focus:ring-1 focus:ring-luxury-gold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-luxury-gold focus:ring-luxury-gold"
                />
                <label htmlFor="remember" className="ml-2 text-sm text-muted-foreground">
                  {t.auth.rememberMe}
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-luxury-gold px-6 py-3 font-montserrat font-semibold uppercase tracking-wider text-luxury-navy transition-all hover:bg-luxury-gold-light active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t.auth.signingIn : t.auth.signIn}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {t.auth.dontHaveAccount}{' '}
                <Link href="/register" className="font-medium text-luxury-gold hover:underline">
                  {t.auth.createAccount}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal 
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        defaultEmail={email}
      />
    </div>
  )
}
