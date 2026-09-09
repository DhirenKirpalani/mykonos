'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Mail, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useLanguage } from '@/contexts/LanguageContext'

interface ForgotPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  defaultEmail?: string
}

export function ForgotPasswordModal({ isOpen, onClose, defaultEmail = '' }: ForgotPasswordModalProps) {
  const { t } = useLanguage()
  const [email, setEmail] = useState(defaultEmail)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailValid, setEmailValid] = useState<boolean | null>(null)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !validateEmail(email)) {
      toast.error(t.resetPassword.invalidEmail)
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        toast.error(error.message || t.resetPassword.errorSending)
        return
      }

      setEmailSent(true)
      toast.success(t.resetPassword.successToast)
    } catch (error: any) {
      console.error('Password reset error:', error)
      toast.error(t.resetPassword.errorSending)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setEmail(defaultEmail)
      setEmailSent(false)
      setEmailValid(null)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="!fixed !left-0 !right-0 !bottom-0 !top-auto !translate-x-0 !translate-y-0 sm:!left-1/2 sm:!top-1/2 sm:!bottom-auto sm:!right-auto sm:!-translate-x-1/2 sm:!-translate-y-1/2 w-full max-w-md max-h-[90vh] overflow-y-auto sm:max-h-[85vh] rounded-t-2xl sm:rounded-lg border-0 sm:border p-6 sm:p-8 shadow-2xl animate-slide-up sm:animate-none">
        <DialogHeader>
          {/* Drag handle for mobile */}
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-gray-300 sm:hidden" />
          
          <DialogTitle className="font-montserrat text-xl sm:text-2xl font-bold text-luxury-navy leading-tight">
            {emailSent ? t.resetPassword.checkEmail : t.resetPassword.title}
          </DialogTitle>
        </DialogHeader>

        {emailSent ? (
          <div className="space-y-5 pt-6">
            <div className="rounded-lg bg-green-50 border border-green-200 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-900">{t.resetPassword.emailSentSuccess}</p>
                  <p className="text-sm text-green-700 mt-1">
                    {t.resetPassword.emailSentTo} <strong>{email}</strong>
                  </p>
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-600 space-y-2">
              <p>{t.resetPassword.checkInbox}</p>
              <p className="text-xs text-gray-500">
                {t.resetPassword.checkSpam}
              </p>
            </div>

            <button
              onClick={handleClose}
              className="w-full bg-luxury-navy text-white font-montserrat text-xs font-bold uppercase tracking-[0.2em] py-4 transition-all hover:bg-luxury-navy-light disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t.resetPassword.close}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-7 pt-6">
            <div className="group">
              <label htmlFor="reset-email" className="block text-xs font-montserrat font-semibold uppercase tracking-widest text-gray-500 mb-2">
                {t.resetPassword.emailAddress}
              </label>
              <div className="border-b border-gray-200 focus-within:border-luxury-gold transition-colors duration-200 flex items-center">
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder={t.resetPassword.emailPlaceholder}
                  required
                  disabled={isSubmitting}
                  autoFocus
                  className="flex-1 w-full bg-transparent py-3 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none pr-3"
                />
                {emailValid === true && (
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                )}
                {emailValid === false && (
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                )}
              </div>
              {emailValid === false && email.length > 0 && (
                <p className="text-sm text-red-600 mt-1">{t.resetPassword.invalidEmail}</p>
              )}
              <p className="font-sans text-xs text-gray-400 mt-3">
                {t.resetPassword.instructions}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1 border border-gray-200 text-gray-500 font-montserrat text-xs font-bold uppercase tracking-[0.2em] py-4 transition-all hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t.resetPassword.cancel}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !emailValid}
                className="flex-1 bg-luxury-navy text-white font-montserrat text-xs font-bold uppercase tracking-[0.2em] py-4 transition-all hover:bg-luxury-navy-light disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? t.resetPassword.sending : t.resetPassword.sendResetLink}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
