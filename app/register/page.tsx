'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { validatePassword, validateEmail } from '@/lib/validation'
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'

export default function RegisterPage() {
  const { t } = useLanguage()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  // Pre-fill email from track order page
  useEffect(() => {
    const signupContext = sessionStorage.getItem('signupContext')
    if (signupContext) {
      try {
        const { email: savedEmail } = JSON.parse(signupContext)
        if (savedEmail) {
          setFormData(prev => ({ ...prev, email: savedEmail }))
        }
      } catch (error) {
        console.error('Error parsing signup context:', error)
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevent duplicate submissions
    if (isSubmitting || loading) {
      console.log('Form submission already in progress, ignoring duplicate')
      return
    }
    
    setError('')
    setIsSubmitting(true)

    // Validate email format
    if (!validateEmail(formData.email)) {
      toast.error(t.auth.invalidEmail, {
        description: t.auth.invalidEmailDesc
      })
      setIsSubmitting(false)
      return
    }

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', formData.email)
      .single()

    if (existingUser) {
      toast.error(t.auth.emailExists, {
        description: t.auth.emailExistsDesc
      })
      setIsSubmitting(false)
      return
    }

    // Validate password strength
    const passwordValidation = validatePassword(formData.password)
    if (!passwordValidation.isValid) {
      toast.error(t.auth.weakPassword, {
        description: t.auth.weakPasswordDesc
      })
      setIsSubmitting(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error(t.auth.passwordsDoNotMatch, {
        description: t.auth.passwordsDoNotMatchDesc
      })
      setIsSubmitting(false)
      return
    }

    if (!termsAccepted) {
      toast.error(t.auth.termsNotAccepted, {
        description: t.auth.termsNotAcceptedDesc
      })
      setIsSubmitting(false)
      return
    }

    setLoading(true)

    try {
      // Detect user's country before registration
      let detectedCountry = 'ID' // Default to Indonesia
      try {
        const regionResponse = await fetch('/api/region/detect')
        if (regionResponse.ok) {
          const regionData = await regionResponse.json()
          detectedCountry = regionData.country_code || 'ID'
          console.log('Detected country for new user:', detectedCountry)
        }
      } catch (regionError) {
        console.error('Failed to detect region, using default:', regionError)
      }

      // Get anonymous user ID before registration (if exists)
      const { data: { session: anonSession } } = await supabase.auth.getSession()
      const anonymousUserId = anonSession?.user?.is_anonymous ? anonSession.user.id : null

      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
            country: detectedCountry,
          },
        },
      })

      if (error) {
        // Handle rate limit errors specifically
        if (error.message?.includes('rate limit') || error.message?.includes('email_send_rate_limit')) {
          toast.error(t.auth.tooManyAttempts, {
            description: t.auth.tooManyAttemptsDesc
          })
          setIsSubmitting(false)
          setLoading(false)
          return
        }
        throw error
      }

      // Merge anonymous cart to new registered user
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
          // Don't block registration if merge fails
        }
      } else {
        // No anonymous cart to merge, just clear cached cart
        localStorage.removeItem('cached_cart')
      }

      // Record terms acceptance
      if (data.user) {
        try {
          await fetch('/api/auth/accept-terms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              terms_version: '1.0',
              privacy_version: '1.0'
            })
          })
        } catch (termsError) {
          console.error('Failed to record terms acceptance:', termsError)
        }
      }

      // User profile is automatically created by database trigger
      // Show success message and redirect
      if (data.user && !data.session) {
        // Email confirmation required
        toast.success(t.auth.registrationSuccess, {
          description: t.auth.registrationSuccessDesc,
          duration: 6000,
        })
      } else if (data.session) {
        toast.success(t.auth.accountCreatedSuccess, {
          description: t.auth.accountCreatedSuccessDesc,
          duration: 4000,
        })
      }
      
      // Delay redirect to show toast
      setTimeout(() => {
        router.push('/login')
      }, 1500)
    } catch (error: any) {
      toast.error(t.auth.registrationFailed, {
        description: error.message || t.auth.registrationFailedDesc
      })
    } finally {
      setLoading(false)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Panel — luxury brand visual (desktop only) */}
      <div className="hidden lg:flex lg:w-[42%] xl:w-[38%] flex-col items-center justify-center relative overflow-hidden bg-luxury-navy flex-shrink-0">
        {/* Decorative rings */}
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full border border-luxury-gold/10" />
        <div className="absolute -bottom-24 -left-24 w-[380px] h-[380px] rounded-full border border-luxury-gold/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-luxury-gold/5" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-14 select-none">
          <p className="text-white/40 font-montserrat text-[10px] tracking-[0.4em] uppercase mb-5">
            Join
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
            Begin your journey with luxury fragrance
          </p>

          {/* Feature list */}
          <div className="mt-12 space-y-3 text-left w-full max-w-[200px]">
            {['Exclusive offers', 'Order tracking', 'Wishlist & more'].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-1 h-1 bg-luxury-gold rounded-full flex-shrink-0" />
                <span className="text-white/40 font-montserrat text-xs tracking-wider">{item}</span>
              </div>
            ))}
          </div>

          {/* Decorative diamond */}
          <div className="mt-12 flex flex-col items-center gap-3">
            <div className="w-2 h-2 rotate-45 bg-luxury-gold/40" />
            <div className="w-px h-12 bg-gradient-to-b from-luxury-gold/40 to-transparent" />
          </div>
        </div>
      </div>

      {/* Right Panel — form */}
      <div className="flex-1 flex flex-col lg:items-center lg:justify-center bg-white overflow-y-auto min-h-screen">

        {/* Mobile-only navy header band */}
        <div className="lg:hidden bg-luxury-navy py-12 px-6 flex flex-col items-center relative overflow-hidden flex-shrink-0">
          {/* Decorative rings */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full border border-luxury-gold/10" />
          <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full border border-luxury-gold/10" />
          <p className="text-white/40 font-montserrat text-[10px] tracking-[0.4em] uppercase mb-4 relative z-10">Join</p>
          <Link href="/" className="relative z-10">
            <span
              className="font-montserrat text-4xl font-semibold tracking-normal hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(90deg, #D9B25E 0%, #FEE19D 50%, #D9B25E 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
            >
              MYKONOS
            </span>
          </Link>
          <div className="w-10 h-px bg-luxury-gold mt-3 relative z-10" />
          <p className="text-white/50 font-sans text-sm italic mt-4 relative z-10 text-center">Begin your journey with luxury fragrance</p>
        </div>

        <div className="w-full max-w-[460px] px-6 py-8 sm:px-8 lg:py-12">

          {/* Form header */}
          <div className="mb-7">
            <h2 className="font-montserrat text-2xl sm:text-3xl font-bold text-luxury-navy leading-tight">
              {t.auth.createAccountTitle}
            </h2>
            <p className="font-sans text-gray-400 text-sm mt-1.5">{t.auth.signUpSubtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* First + Last Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-xs font-montserrat font-semibold uppercase tracking-widest text-gray-500 mb-2">
                  {t.auth.firstName}
                </label>
                <div className="border-b border-gray-200 focus-within:border-luxury-gold transition-colors duration-200">
                  <input
                    type="text"
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                    className="w-full bg-transparent py-3 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none"
                    placeholder="First"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="lastName" className="block text-xs font-montserrat font-semibold uppercase tracking-widest text-gray-500 mb-2">
                  {t.auth.lastName}
                </label>
                <div className="border-b border-gray-200 focus-within:border-luxury-gold transition-colors duration-200">
                  <input
                    type="text"
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                    className="w-full bg-transparent py-3 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none"
                    placeholder="Last"
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-montserrat font-semibold uppercase tracking-widest text-gray-500 mb-2">
                {t.auth.emailAddress}
              </label>
              <div className="border-b border-gray-200 focus-within:border-luxury-gold transition-colors duration-200">
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full bg-transparent py-3 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-xs font-montserrat font-semibold uppercase tracking-widest text-gray-500 mb-2">
                {t.auth.phone} <span className="normal-case tracking-normal text-gray-300">(optional)</span>
              </label>
              <div className="border-b border-gray-200 focus-within:border-luxury-gold transition-colors duration-200">
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-transparent py-3 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none"
                  placeholder="+62 ..."
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-montserrat font-semibold uppercase tracking-widest text-gray-500 mb-2">
                {t.auth.password}
              </label>
              <div className="border-b border-gray-200 focus-within:border-luxury-gold transition-colors duration-200 flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="flex-1 bg-transparent py-3 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none pr-3"
                  placeholder="Min. 8 characters"
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
              <div className="mt-2">
                <PasswordStrengthIndicator password={formData.password} />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-montserrat font-semibold uppercase tracking-widest text-gray-500 mb-2">
                {t.auth.confirmPassword}
              </label>
              <div className="border-b border-gray-200 focus-within:border-luxury-gold transition-colors duration-200 flex items-center">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  className="flex-1 bg-transparent py-3 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none pr-3"
                  placeholder="Repeat password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start gap-3 pt-1">
              <div
                onClick={() => setTermsAccepted(!termsAccepted)}
                className={`mt-0.5 w-4 h-4 rounded border cursor-pointer flex-shrink-0 transition-colors ${termsAccepted ? 'bg-luxury-gold border-luxury-gold' : 'border-gray-300 bg-white'}`}
              >
                {termsAccepted && (
                  <svg className="w-3 h-3 text-white mx-auto mt-0.5" fill="none" viewBox="0 0 12 12">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <label className="text-xs text-gray-400 leading-relaxed cursor-pointer" onClick={() => setTermsAccepted(!termsAccepted)}>
                {t.auth.agreeToTermsPre}
                <Link href="/terms" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="font-semibold text-luxury-gold hover:underline">
                  {t.auth.termsOfService}
                </Link>
                {t.auth.agreeToTermsMiddle}
                <Link href="/privacy" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="font-semibold text-luxury-gold hover:underline">
                  {t.auth.privacyPolicy}
                </Link>
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || isSubmitting}
              className="w-full bg-luxury-navy text-white font-montserrat text-xs font-bold uppercase tracking-[0.2em] py-4 rounded-none transition-all hover:bg-luxury-navy-light disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
            >
              <span className="relative z-10">
                {loading || isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t.auth.registering}
                  </span>
                ) : t.auth.createAccount}
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

          {/* Sign in link */}
          <p className="text-center text-sm text-gray-400">
            {t.auth.haveAccount}{' '}
            <Link href="/login" className="font-semibold text-luxury-gold hover:text-luxury-gold-dark transition-colors">
              {t.auth.signIn}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
