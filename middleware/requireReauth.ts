/**
 * Re-authentication Middleware
 * Requires users to re-enter their password for critical actions
 */

import { createClient } from '@supabase/supabase-js'

const REAUTH_WINDOW = 5 * 60 * 1000 // 5 minutes in milliseconds

interface ReauthSession {
  userId: string
  reauthenticatedAt: number
}

// In-memory store for reauth sessions (in production, use Redis or similar)
const reauthSessions = new Map<string, ReauthSession>()

/**
 * Check if user has recently re-authenticated
 */
export function hasRecentReauth(userId: string): boolean {
  const session = reauthSessions.get(userId)
  
  if (!session) {
    return false
  }
  
  const now = Date.now()
  const timeSinceReauth = now - session.reauthenticatedAt
  
  if (timeSinceReauth > REAUTH_WINDOW) {
    // Session expired, remove it
    reauthSessions.delete(userId)
    return false
  }
  
  return true
}

/**
 * Verify user password and create reauth session
 */
export async function verifyAndCreateReauthSession(
  userId: string,
  password: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get user email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single()
    
    if (userError || !userData) {
      return { success: false, error: 'User not found' }
    }
    
    // Attempt to sign in with email and password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userData.email,
      password: password
    })
    
    if (signInError) {
      return { success: false, error: 'Invalid password' }
    }
    
    // Create reauth session
    reauthSessions.set(userId, {
      userId,
      reauthenticatedAt: Date.now()
    })
    
    return { success: true }
  } catch (error) {
    console.error('Reauth verification error:', error)
    return { success: false, error: 'Verification failed' }
  }
}

/**
 * Clear reauth session
 */
export function clearReauthSession(userId: string): void {
  reauthSessions.delete(userId)
}

/**
 * Middleware to require re-authentication for critical actions
 */
export async function requireReauth(
  userId: string,
  action: string
): Promise<{ allowed: boolean; error?: string }> {
  // Check if user has recent reauth
  if (hasRecentReauth(userId)) {
    return { allowed: true }
  }
  
  return {
    allowed: false,
    error: 'Re-authentication required for this action'
  }
}

/**
 * Critical actions that require re-authentication
 */
export const CRITICAL_ACTIONS = {
  ASSIGN_ROLE: 'assign_role',
  OVERRIDE_ORDER: 'override_order',
  DISABLE_CHECKOUT: 'disable_checkout',
  DISABLE_PAYMENTS: 'disable_payments',
  ENABLE_MAINTENANCE: 'enable_maintenance',
  DELETE_USER: 'delete_user',
  MODIFY_PRICING: 'modify_pricing',
  DELETE_PROMO_CODE: 'delete_promo_code'
} as const

export type CriticalAction = typeof CRITICAL_ACTIONS[keyof typeof CRITICAL_ACTIONS]
