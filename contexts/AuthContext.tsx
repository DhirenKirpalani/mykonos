'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, userData: any) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = async () => {
    console.log('[AuthProvider] refreshUser called')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      console.log('[AuthProvider] refreshUser - session retrieved:', session?.user?.id || 'null')
      setUser(session?.user || null)
    } catch (error) {
      console.error('[AuthProvider] Error refreshing user:', error)
      setUser(null)
    }
  }

  const signIn = async (email: string, password: string) => {
    console.log('[AuthProvider] signIn called for email:', email)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) {
      console.error('[AuthProvider] signIn error:', error)
      throw error
    }
    console.log('[AuthProvider] signIn successful, user:', data.user?.id)
    setUser(data.user)
  }

  const signUp = async (email: string, password: string, userData: any) => {
    console.log('[AuthProvider] signUp called for email:', email)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
      },
    })
    if (error) {
      console.error('[AuthProvider] signUp error:', error)
      throw error
    }
    console.log('[AuthProvider] signUp successful, user:', data.user?.id)
    setUser(data.user)
  }

  const signOut = async () => {
    console.log('[AuthProvider] signOut called')
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('[AuthProvider] signOut error:', error)
      throw error
    }
    console.log('[AuthProvider] signOut successful')
    setUser(null)
  }

  useEffect(() => {
    console.log('[AuthProvider] useEffect - Initializing auth, isLoading:', isLoading, 'user:', user?.id || 'null')
    let mounted = true
    let timeoutId: NodeJS.Timeout

    // Get initial session with timeout
    const initAuth = async () => {
      console.log('[AuthProvider] initAuth - Starting session retrieval')
      try {
        // Set a timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          if (mounted && isLoading) {
            console.warn('[AuthProvider] Auth initialization timeout - proceeding without auth')
            setUser(null)
            setIsLoading(false)
          }
        }, 3000) // 3 second timeout

        console.log('[AuthProvider] initAuth - Calling supabase.auth.getSession()')
        const startTime = Date.now()
        const { data: { session }, error } = await supabase.auth.getSession()
        const endTime = Date.now()
        console.log(`[AuthProvider] initAuth - getSession completed in ${endTime - startTime}ms`)
        
        clearTimeout(timeoutId)
        
        if (mounted) {
          if (error) {
            console.error('[AuthProvider] Error getting session:', error)
            setUser(null)
          } else {
            console.log('[AuthProvider] Session retrieved successfully:', session?.user?.id || 'no user')
            setUser(session?.user || null)
          }
          console.log('[AuthProvider] Setting isLoading to false')
          setIsLoading(false)
        } else {
          console.log('[AuthProvider] Component unmounted, skipping state update')
        }
      } catch (error) {
        console.error('[AuthProvider] Error initializing auth:', error)
        clearTimeout(timeoutId)
        if (mounted) {
          setUser(null)
          setIsLoading(false)
        }
      }
    }

    initAuth()

    // Listen for auth changes
    console.log('[AuthProvider] Setting up auth state change listener')
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthProvider] Auth state changed - event:', event, 'user:', session?.user?.id || 'null')
      if (mounted) {
        // Only update if user actually changed to prevent infinite loops
        setUser((prevUser) => {
          const newUserId = session?.user?.id || null
          const prevUserId = prevUser?.id || null
          
          if (newUserId !== prevUserId) {
            console.log('[AuthProvider] User changed from', prevUserId, 'to', newUserId)
            return session?.user || null
          }
          
          console.log('[AuthProvider] User unchanged, skipping state update')
          return prevUser
        })
      }
    })

    return () => {
      console.log('[AuthProvider] useEffect cleanup - unmounting')
      mounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        signIn,
        signUp,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
