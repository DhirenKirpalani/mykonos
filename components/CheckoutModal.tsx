'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Mail, MapPin, CheckCircle2, AlertCircle, Map, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useRegion } from '@/contexts/RegionContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { COUNTRIES, validatePhone, validateAddress, validatePostalCode, getCountryByRegion, formatPhoneNumber } from '@/lib/utils/address'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ForgotPasswordModal } from '@/components/ForgotPasswordModal'
import dynamic from 'next/dynamic'

const MapPicker = dynamic(() => import('@/components/map/MapPicker').then(mod => ({ default: mod.MapPicker })), {
  ssr: false,
  loading: () => <div className="h-[300px] flex items-center justify-center bg-luxury-gray-light rounded-lg">Loading map...</div>
})

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    email: string
    full_name: string
    phone: string
    address_line1: string
    address_line2: string
    city: string
    state_province: string
    postal_code: string
    country: string
  }) => Promise<void>
}

export function CheckoutModal({ isOpen, onClose, onSubmit }: CheckoutModalProps) {
  const router = useRouter()
  const { region } = useRegion()
  const { t } = useLanguage()
  const [step, setStep] = useState<'email' | 'password' | 'address'>('email')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [emailValid, setEmailValid] = useState<boolean | null>(null)
  const [isRegistered, setIsRegistered] = useState(false)
  const [fetchedAddress, setFetchedAddress] = useState<any>(null)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  const [email, setEmail] = useState('')
  const [shippingForm, setShippingForm] = useState({
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state_province: '',
    postal_code: '',
    country: 'United States',
  })

  // Set country based on region when modal opens
  useEffect(() => {
    if (isOpen && region) {
      const countryCode = getCountryByRegion(region.code)
      const country = COUNTRIES[countryCode]
      if (country) {
        setShippingForm(prev => ({
          ...prev,
          country: country.name
        }))
      }
    }
  }, [isOpen, region])

  const currentCountryCode = Object.values(COUNTRIES).find(c => c.name === shippingForm.country)?.code || 'ID'
  const currentCountry = COUNTRIES[currentCountryCode]

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    
    if (value.length > 0) {
      setEmailValid(validateEmail(value))
    } else {
      setEmailValid(null)
    }
  }

  const checkEmailExists = async (): Promise<{ exists: boolean; hasAddress: boolean }> => {
    if (!email || !validateEmail(email)) return { exists: false, hasAddress: false }

    setCheckingEmail(true)
    try {
      const response = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (data.exists) {
        setIsRegistered(true)
        
        // Fetch user's default address
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: addresses } = await supabase
            .from('shipping_addresses')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_default', true)
            .single()
          
          if (addresses) {
            const typedAddress = addresses as any
            setFetchedAddress(typedAddress)
            setShippingForm({
              full_name: typedAddress.full_name,
              phone: typedAddress.phone,
              address_line1: typedAddress.address_line1,
              address_line2: typedAddress.address_line2 || '',
              city: typedAddress.city,
              state_province: typedAddress.state_province,
              postal_code: typedAddress.postal_code,
              country: typedAddress.country,
            })
            
            toast.success('Email found! Using your saved address.', {
              duration: 3000,
            })
            return { exists: true, hasAddress: true }
          }
        }
        
        return { exists: true, hasAddress: false }
      } else {
        setIsRegistered(false)
        return { exists: false, hasAddress: false }
      }
    } catch (error) {
      console.error('Email check error:', error)
      setIsRegistered(false)
      return { exists: false, hasAddress: false }
    } finally {
      setCheckingEmail(false)
    }
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !validateEmail(email)) {
      toast.error('Please enter a valid email address')
      return
    }
    
    // Check email before proceeding
    const { exists, hasAddress } = await checkEmailExists()
    
    // If registered and has saved address, go directly to address step for guest checkout
    // If registered but no saved address, show password prompt
    // If not registered, show address form
    if (exists && hasAddress) {
      setStep('address')
    } else if (exists) {
      setStep('password')
    } else {
      setStep('address')
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setIsSubmitting(true)

    try {
      // Get anonymous user ID before login (if exists)
      const { data: { session: anonSession } } = await supabase.auth.getSession()
      const anonymousUserId = anonSession?.user?.is_anonymous ? anonSession.user.id : null

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setPasswordError(error.message)
        toast.error('Invalid password')
        return
      }

      if (data.user) {
        // Merge anonymous cart to logged-in user
        if (anonymousUserId) {
          try {
            console.log('🔄 [CHECKOUT MODAL] Merging anonymous cart:', anonymousUserId, '→', data.user.id)
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
            console.log('✅ [CHECKOUT MODAL] Cart merge completed')
          } catch (mergeError) {
            console.error('❌ [CHECKOUT MODAL] Cart merge error:', mergeError)
            // Don't block login if merge fails
          }
        }

        toast.success('Logged in successfully!')
        // Set flag to prevent checkout page from re-initializing before reload
        sessionStorage.setItem('checkout_reloading', 'true')
        // Keep loading state and reload page to show logged-in state
        // Note: Buy Now items remain in sessionStorage and will be processed during checkout
        // Don't call onClose() or setIsSubmitting(false) to prevent form flash
        // The modal will stay open with loading state until page reloads
        window.location.reload()
      }
    } catch (error: any) {
      setPasswordError('Login failed. Please try again.')
      toast.error('Login failed')
      setIsSubmitting(false)
    }
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    // Validate phone
    const phoneValidation = validatePhone(shippingForm.phone, currentCountryCode)
    if (!phoneValidation.valid) {
      errors.phone = phoneValidation.message || 'Invalid phone number'
    }

    // Validate address
    const addressValidation = validateAddress(shippingForm.address_line1)
    if (!addressValidation.valid) {
      errors.address_line1 = addressValidation.message || 'Invalid address'
    }

    // Validate postal code
    const postalValidation = validatePostalCode(shippingForm.postal_code, currentCountryCode)
    if (!postalValidation.valid) {
      errors.postal_code = postalValidation.message || 'Invalid postal code'
    }

    // Validate required fields
    if (!shippingForm.full_name.trim()) {
      errors.full_name = 'Full name is required'
    }
    if (!shippingForm.city) {
      errors.city = 'City is required'
    }
    if (!shippingForm.state_province) {
      errors.state_province = 'State/Province is required'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('Please fix the validation errors')
      return
    }

    setIsSubmitting(true)

    try {
      await onSubmit({
        email,
        ...shippingForm,
      })
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setStep('email')
      setEmail('')
      setPassword('')
      setPasswordError('')
      setEmailValid(null)
      setIsRegistered(false)
      setFetchedAddress(null)
      setShowPassword(false)
      setValidationErrors({})
      setShippingForm({
        full_name: '',
        phone: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state_province: '',
        postal_code: '',
        country: 'United States',
      })
      onClose()
    }
  }

  const getStepNumber = () => {
    if (step === 'email') return 1
    if (step === 'password') return 2
    return 3
  }

  const getTotalSteps = () => {
    // If user is registered, they go through password step (3 steps total)
    // If not registered, they skip password (2 steps total)
    return isRegistered ? 3 : 2
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="!fixed !left-0 !right-0 !bottom-0 !top-auto !translate-x-0 !translate-y-0 sm:!left-1/2 sm:!top-1/2 sm:!bottom-auto sm:!right-auto sm:!-translate-x-1/2 sm:!-translate-y-1/2 w-full max-w-lg max-h-[90vh] overflow-y-auto sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl border-0 sm:border p-6 shadow-2xl animate-slide-up sm:animate-none">
        <DialogHeader>
          {/* Drag handle for mobile */}
          <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-gray-300 sm:hidden" />
          
          {/* Progress Indicator */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">
                {t.checkout?.step || 'Step'} {step === 'password' ? 2 : step === 'address' ? (isRegistered ? 3 : 2) : 1} {t.checkout?.of || 'of'} {getTotalSteps()}
              </span>
              <span className="text-xs text-gray-500">
                {step === 'email' ? (t.emailModal?.title || 'Email') : step === 'password' ? (t.checkout?.signIn || 'Sign In') : (t.shippingModal?.title || 'Shipping')}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-luxury-gold h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${((step === 'email' ? 1 : step === 'password' ? 2 : (isRegistered ? 3 : 2)) / getTotalSteps()) * 100}%` 
                }}
              />
            </div>
          </div>

          <DialogTitle className="flex items-center gap-2">
            {step === 'email' && (
              <>
                <Mail className="h-5 w-5 text-luxury-navy" />
                {t.emailModal.title}
              </>
            )}
            {step === 'password' && (
              <>
                <CheckCircle2 className="h-5 w-5 text-luxury-navy" />
                {t.checkout?.welcomeBack || 'Welcome Back!'}
              </>
            )}
            {step === 'address' && (
              <>
                <MapPin className="h-5 w-5 text-luxury-navy" />
                {t.shippingModal.title}
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4 pt-2 sm:pt-4">
            <div>
              <Label htmlFor="modal-email">{t.emailModal.emailAddress} *</Label>
              <div className="relative">
                <Input
                  id="modal-email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder={t.trackOrder.emailPlaceholder}
                  required
                  disabled={checkingEmail || isSubmitting}
                  autoFocus
                  className={`pr-10 ${
                    emailValid === false ? 'border-red-500 focus:ring-red-500' : 
                    emailValid === true ? 'border-green-500 focus:ring-green-500' : ''
                  }`}
                />
                {emailValid === true && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                )}
                {emailValid === false && (
                  <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
                )}
              </div>
              {checkingEmail && (
                <p className="text-sm text-blue-600 mt-1 flex items-center gap-1">
                  <span className="animate-spin">⏳</span> {t.emailModal?.checkingEmail || 'Checking email...'}
                </p>
              )}
              {emailValid === false && email.length > 0 && (
                <p className="text-sm text-red-600 mt-1">{t.emailModal?.invalidEmail || 'Please enter a valid email address'}</p>
              )}
              {emailValid === true && !checkingEmail && (
                <p className="text-sm text-green-600 mt-1">{t.emailModal.validFormat}</p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                {t.emailModal.confirmationText}
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1 min-h-[44px]">
                {t.emailModal.cancel}
              </Button>
              <Button type="submit" className="flex-1 bg-luxury-navy hover:bg-luxury-navy-light min-h-[44px]">
                {t.emailModal.continue}
              </Button>
            </div>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4 pt-2 sm:pt-4">
            <div>
              <Label htmlFor="modal-email-display">{t.emailModal?.emailAddress || 'Email'}</Label>
              <Input
                id="modal-email-display"
                type="email"
                value={email}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div>
              <Label htmlFor="modal-password">{t.checkout?.password || 'Password'} *</Label>
              <div className="relative">
                <Input
                  id="modal-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  placeholder={t.checkout?.enterPassword || 'Enter your password'}
                  required
                  disabled={isSubmitting}
                  autoFocus
                  className={passwordError ? 'border-red-500' : ''}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {passwordError && (
                <p className="text-sm text-red-600 mt-1">{passwordError}</p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                <button 
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-luxury-navy hover:underline"
                >
                  {t.checkout?.forgotPassword || 'Forgot password?'}
                </button>
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setStep('email')} 
                className="flex-1 min-h-[44px]"
                disabled={isSubmitting}
              >
                {t.shippingModal?.back || 'Back'}
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-luxury-navy hover:bg-luxury-navy-light min-h-[44px]"
                disabled={isSubmitting}
              >
                {isSubmitting ? (t.checkout?.signingIn || 'Signing in...') : (t.checkout?.signIn || 'Sign In')}
              </Button>
            </div>
          </form>
        )}

        {step === 'address' && (
          <form onSubmit={handleAddressSubmit} className="space-y-4 pt-2 sm:pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="modal-full_name">{t.shippingModal.fullName} *</Label>
                <Input
                  id="modal-full_name"
                  value={shippingForm.full_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setShippingForm({...shippingForm, full_name: e.target.value})
                  }
                  required
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="modal-phone">{t.shippingModal.phoneNumber} *</Label>
                <Input
                  id="modal-phone"
                  type="tel"
                  value={shippingForm.phone}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const value = e.target.value
                    setShippingForm({...shippingForm, phone: value})
                    // Clear error on change
                    if (validationErrors.phone) {
                      setValidationErrors(prev => {
                        const newErrors = {...prev}
                        delete newErrors.phone
                        return newErrors
                      })
                    }
                  }}
                  onBlur={() => {
                    // Format phone on blur
                    const formatted = formatPhoneNumber(shippingForm.phone, currentCountryCode)
                    setShippingForm({...shippingForm, phone: formatted})
                  }}
                  placeholder={currentCountry?.phoneExample || '+1 (555) 123-4567'}
                  className={validationErrors.phone ? 'border-red-500' : ''}
                  required
                />
                {validationErrors.phone && (
                  <p className="text-xs text-red-600 mt-1">{validationErrors.phone}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="modal-address_line1">{t.shippingModal.addressLine1} *</Label>
              <Input
                id="modal-address_line1"
                value={shippingForm.address_line1}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setShippingForm({...shippingForm, address_line1: e.target.value})
                  // Clear error on change
                  if (validationErrors.address_line1) {
                    setValidationErrors(prev => {
                      const newErrors = {...prev}
                      delete newErrors.address_line1
                      return newErrors
                    })
                  }
                }}
                placeholder={t.shippingModal.streetPlaceholder}
                className={validationErrors.address_line1 ? 'border-red-500' : ''}
                required
              />
              {validationErrors.address_line1 && (
                <p className="text-xs text-red-600 mt-1">{validationErrors.address_line1}</p>
              )}
            </div>

            <div>
              <Label htmlFor="modal-address_line2">{t.shippingModal.addressLine2}</Label>
              <Input
                id="modal-address_line2"
                value={shippingForm.address_line2}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setShippingForm({...shippingForm, address_line2: e.target.value})
                }
                placeholder={t.shippingModal.apartmentPlaceholder}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="modal-city">{t.shippingModal.city} *</Label>
                <Select
                  value={shippingForm.city}
                  onValueChange={(value: string) => {
                    setShippingForm({...shippingForm, city: value})
                    if (validationErrors.city) {
                      setValidationErrors(prev => {
                        const newErrors = {...prev}
                        delete newErrors.city
                        return newErrors
                      })
                    }
                  }}
                >
                  <SelectTrigger className={validationErrors.city ? 'border-red-500' : ''}>
                    <SelectValue placeholder={t.shippingModal.selectCity} />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {currentCountry?.cities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {validationErrors.city && (
                  <p className="text-xs text-red-600 mt-1">{validationErrors.city}</p>
                )}
              </div>
              <div>
                <Label htmlFor="modal-state_province">{t.shippingModal.stateProvince} *</Label>
                <Select
                  value={shippingForm.state_province}
                  onValueChange={(value: string) => {
                    setShippingForm({...shippingForm, state_province: value})
                    if (validationErrors.state_province) {
                      setValidationErrors(prev => {
                        const newErrors = {...prev}
                        delete newErrors.state_province
                        return newErrors
                      })
                    }
                  }}
                >
                  <SelectTrigger className={validationErrors.state_province ? 'border-red-500' : ''}>
                    <SelectValue placeholder={t.shippingModal.selectState} />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {currentCountry?.states.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {validationErrors.state_province && (
                  <p className="text-xs text-red-600 mt-1">{validationErrors.state_province}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="modal-postal_code">{t.shippingModal.postalCode} *</Label>
                <Input
                  id="modal-postal_code"
                  value={shippingForm.postal_code}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setShippingForm({...shippingForm, postal_code: e.target.value})
                    if (validationErrors.postal_code) {
                      setValidationErrors(prev => {
                        const newErrors = {...prev}
                        delete newErrors.postal_code
                        return newErrors
                      })
                    }
                  }}
                  placeholder={currentCountryCode === 'US' ? '12345' : currentCountryCode === 'ID' ? '12345' : 'Postal code'}
                  className={validationErrors.postal_code ? 'border-red-500' : ''}
                  required
                />
                {validationErrors.postal_code && (
                  <p className="text-xs text-red-600 mt-1">{validationErrors.postal_code}</p>
                )}
              </div>
              <div>
                <Label htmlFor="modal-country">{t.shippingModal.country} *</Label>
                <Input
                  id="modal-country"
                  value={shippingForm.country}
                  disabled
                  className="bg-gray-50"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">{t.shippingModal.basedOnRegion}</p>
              </div>
            </div>

            {/* Map Picker Section */}
            <div>
              <button
                type="button"
                onClick={() => setShowMap(!showMap)}
                className="inline-flex items-center gap-2 text-sm font-medium text-luxury-gold hover:text-luxury-gold/80 transition-colors"
              >
                <Map className="h-4 w-4" />
                {showMap ? 'Hide Map' : t.shippingModal.pickLocation}
              </button>
            </div>

            {showMap && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Click on the map to automatically fill in address details
                </p>
                <MapPicker
                  onLocationSelect={(location) => {
                    const updates: any = {}
                    
                    if (location.address) {
                      updates.address_line1 = location.address.split(',')[0] || ''
                    }
                    if (location.city) {
                      updates.city = location.city
                    }
                    if (location.state) {
                      updates.state_province = location.state
                    }
                    if (location.postalCode) {
                      updates.postal_code = location.postalCode
                    }
                    if (location.country) {
                      const matchedCountry = Object.values(COUNTRIES).find(
                        c => c.name.toLowerCase() === location.country?.toLowerCase()
                      )
                      if (matchedCountry) {
                        updates.country = matchedCountry.name
                      }
                    }
                    
                    setShippingForm(prev => ({ ...prev, ...updates }))
                    toast.success('Address details filled from map')
                  }}
                  initialPosition={shippingForm.country === 'Indonesia' ? [-6.2088, 106.8456] : [40.7128, -74.0060]}
                  height="300px"
                />
              </div>
            )}

            <div className="flex gap-3 pt-4 pb-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setStep('email')} 
                className="flex-1 min-h-[44px]"
                disabled={isSubmitting}
              >
                {t.shippingModal.back}
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-luxury-navy hover:bg-luxury-navy-light min-h-[44px]"
                disabled={isSubmitting}
              >
                {isSubmitting ? (t.checkout?.processing || 'Processing...') : t.shippingModal.placeOrder}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal 
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        defaultEmail={email}
      />
    </Dialog>
  )
}
