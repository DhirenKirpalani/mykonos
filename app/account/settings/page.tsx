'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Lock, Globe, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase/client'

export default function SettingsPage() {
  const { t } = useLanguage()
  const [showForm, setShowForm] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' })

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)

    if (form.newPassword.length < 8) {
      setFeedback({ type: 'error', message: 'Password must be at least 8 characters.' })
      return
    }
    if (form.newPassword !== form.confirmPassword) {
      setFeedback({ type: 'error', message: 'Passwords do not match.' })
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: form.newPassword })
      if (error) throw error
      setFeedback({ type: 'success', message: 'Password updated successfully.' })
      setForm({ newPassword: '', confirmPassword: '' })
      setShowForm(false)
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update password.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border/40 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Lock className="h-5 w-5 text-luxury-gold" />
          <h2 className="font-serif text-xl font-bold">{t.account.security}</h2>
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-1">{t.account.password}</h3>
            <p className="text-sm text-muted-foreground mb-3">{t.account.changePasswordDesc}</p>

            {feedback && (
              <div className={`flex items-center gap-2 mb-4 rounded-md px-4 py-3 text-sm ${
                feedback.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {feedback.type === 'success'
                  ? <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  : <XCircle className="h-4 w-4 flex-shrink-0" />}
                {feedback.message}
              </div>
            )}

            {!showForm ? (
              <Button variant="outline" onClick={() => { setShowForm(true); setFeedback(null) }}>
                {t.account.changePassword}
              </Button>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">New Password</label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={form.newPassword}
                      onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                      required
                      minLength={8}
                      placeholder="Min. 8 characters"
                      className="w-full rounded-md border border-input bg-background px-4 py-3 pr-11 text-sm focus:border-luxury-gold focus:outline-none focus:ring-1 focus:ring-luxury-gold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={form.confirmPassword}
                      onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                      required
                      placeholder="Repeat new password"
                      className="w-full rounded-md border border-input bg-background px-4 py-3 pr-11 text-sm focus:border-luxury-gold focus:outline-none focus:ring-1 focus:ring-luxury-gold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <Button type="submit" variant="luxury" size="sm" disabled={isLoading}>
                    {isLoading ? 'Saving…' : 'Save Password'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { setShowForm(false); setForm({ newPassword: '', confirmPassword: '' }); setFeedback(null) }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border/40 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="h-5 w-5 text-luxury-gold" />
          <h2 className="font-serif text-xl font-bold">{t.account.languagePreferences}</h2>
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-1">{t.account.language}</h3>
            <p className="text-sm text-muted-foreground mb-3">{t.account.languageDesc}</p>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </div>
  )
}
