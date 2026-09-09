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
    <div className="flex min-h-screen">
      {/* Left Panel — luxury brand visual (desktop only) */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] flex-col items-center justify-center relative overflow-hidden bg-luxury-navy">
        {/* Decorative rings */}
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full border border-luxury-gold/10" />
        <div className="absolute -bottom-24 -left-24 w-[380px] h-[380px] rounded-full border border-luxury-gold/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-luxury-gold/5" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-14 select-none">
          <p className="text-white/40 font-montserrat text-[10px] tracking-[0.4em] uppercase mb-5">
            Welcome to
          </p>
          <Link href="/" className="mb-4 block">
            <span
              className="font-montserrat text-5xl xl:text-6xl font-semibold tracking-normal hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(90deg, #D9B25E 0%, #FEE19D 50%, #D9B25E 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
            >
              MYKONOS
            </span>
          </Link>
          <div className="w-12 h-px bg-luxury-gold mb-5" />
          <p className="text-white/50 font-sans text-base xl:text-lg italic leading-relaxed max-w-xs">
            Discover the art of luxury fragrance
          </p>

          {/* Decorative diamond */}
          <div className="mt-14 flex flex-col items-center gap-3">
            <div className="w-2 h-2 rotate-45 bg-luxury-gold/40" />
            <div className="w-px h-16 bg-gradient-to-b from-luxury-gold/40 to-transparent" />
          </div>
        </div>
      </div>

      {/* Right Panel — form */}
      <div className="flex-1 flex flex-col lg:items-center lg:justify-center bg-white min-h-screen">

        {/* Mobile-only navy header band */}
        <div className="lg:hidden bg-luxury-navy py-12 px-6 flex flex-col items-center relative overflow-hidden flex-shrink-0">
          {/* Decorative rings */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full border border-luxury-gold/10" />
          <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full border border-luxury-gold/10" />
          <Link href="/" className="relative z-10">
            <span
              className="font-montserrat text-4xl font-semibold tracking-normal hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(90deg, #D9B25E 0%, #FEE19D 50%, #D9B25E 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
            >
              MYKONOS
            </span>
          </Link>
          <div className="w-10 h-px bg-luxury-gold mt-3 relative z-10" />
        </div>

        <div className="w-full max-w-[420px] px-6 py-10 sm:px-8 lg:py-12">

          {/* Form header */}
          <div className="mb-8">
            <h2 className="font-montserrat text-2xl sm:text-3xl font-bold text-luxury-navy leading-tight">
              {t.auth.welcomeBack}
            </h2>
            <p className="font-sans text-gray-400 text-sm mt-1.5">{t.auth.signInSubtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-7">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Email */}
            <div className="group">
              <label htmlFor="email" className="block text-xs font-montserrat font-semibold uppercase tracking-widest text-gray-500 mb-2">
                {t.auth.emailAddress}
              </label>
              <div className="border-b border-gray-200 focus-within:border-luxury-gold transition-colors duration-200">
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-transparent py-3 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-xs font-montserrat font-semibold uppercase tracking-widest text-gray-500">
                  {t.auth.password}
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs text-luxury-gold hover:text-luxury-gold-dark transition-colors"
                >
                  {t.auth.forgotPassword}
                </button>
              </div>
              <div className="border-b border-gray-200 focus-within:border-luxury-gold transition-colors duration-200 flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="flex-1 bg-transparent py-3 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none pr-3"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2.5">
              <div className="relative flex-shrink-0">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="sr-only"
                />
                <div
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`w-4 h-4 rounded border cursor-pointer transition-colors ${rememberMe ? 'bg-luxury-gold border-luxury-gold' : 'border-gray-300 bg-white'}`}
                >
                  {rememberMe && (
                    <svg className="w-3 h-3 text-white mx-auto mt-0.5" fill="none" viewBox="0 0 12 12">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </div>
              <label htmlFor="remember" className="text-xs text-gray-400 cursor-pointer select-none" onClick={() => setRememberMe(!rememberMe)}>
                {t.auth.rememberMe}
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-luxury-navy text-white font-montserrat text-xs font-bold uppercase tracking-[0.2em] py-4 rounded-none transition-all hover:bg-luxury-navy-light disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
            >
              <span className="relative z-10">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t.auth.signingIn}
                  </span>
                ) : t.auth.signIn}
              </span>
              <span className="absolute inset-0 bg-luxury-gold opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-300 font-montserrat tracking-widest uppercase">or</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Sign up link */}
          <p className="text-center text-sm text-gray-400">
            {t.auth.dontHaveAccount}{' '}
            <Link href="/register" className="font-semibold text-luxury-gold hover:text-luxury-gold-dark transition-colors">
              {t.auth.createAccount}
            </Link>
          </p>
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
