import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ROUTES, TOAST_DURATION } from '@/lib/constants'
import type { LoginFormData, RegisterFormData, AuthError } from '@/lib/types'

export function useAuth() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const router = useRouter()

  const signIn = async (credentials: LoginFormData) => {
    setError('')
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      })

      if (error) throw error

      router.push(ROUTES.HOME)
      return { success: true, data }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to sign in'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (formData: RegisterFormData) => {
    setError('')
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}${ROUTES.AUTH_CALLBACK}`,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
          },
        },
      })

      if (error) throw error

      if (data.user && !data.session) {
        toast.success('Registration successful!', {
          description: 'Please check your email to confirm your account.',
          duration: TOAST_DURATION.EXTRA_LONG,
        })
      } else if (data.session) {
        toast.success('Account created successfully!', {
          description: 'You can now sign in to your account.',
          duration: TOAST_DURATION.LONG,
        })
      }

      setTimeout(() => {
        router.push(ROUTES.LOGIN)
      }, 1500)

      return { success: true, data }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create account'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push(ROUTES.LOGIN)
  }

  return {
    signIn,
    signUp,
    signOut,
    loading,
    error,
    setError,
  }
}
