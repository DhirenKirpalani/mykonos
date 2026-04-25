'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react'
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {emailSent ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                {t.resetPassword.checkEmail}
              </>
            ) : (
              <>
                <Mail className="h-5 w-5 text-luxury-navy" />
                {t.resetPassword.title}
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {emailSent ? (
          <div className="space-y-4 pt-4">
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

            <Button 
              onClick={handleClose} 
              className="w-full bg-luxury-navy hover:bg-luxury-navy-light"
            >
              {t.resetPassword.close}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div>
              <Label htmlFor="reset-email">{t.resetPassword.emailAddress} *</Label>
              <div className="relative">
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder={t.resetPassword.emailPlaceholder}
                  required
                  disabled={isSubmitting}
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
              {emailValid === false && email.length > 0 && (
                <p className="text-sm text-red-600 mt-1">{t.resetPassword.invalidEmail}</p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                {t.resetPassword.instructions}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose} 
                className="flex-1"
                disabled={isSubmitting}
              >
                {t.resetPassword.cancel}
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-luxury-navy hover:bg-luxury-navy-light"
                disabled={isSubmitting || !emailValid}
              >
                {isSubmitting ? t.resetPassword.sending : t.resetPassword.sendResetLink}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
