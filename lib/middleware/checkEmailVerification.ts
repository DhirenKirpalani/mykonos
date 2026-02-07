import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export async function checkEmailVerification(userId: string): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

  try {
    const { data: profile, error } = await supabase
      .from('users')
      .select('email_verified')
      .eq('id', userId)
      .single() as { data: { email_verified: boolean } | null; error: any }

    if (error) {
      console.error('Error checking email verification:', error)
      return false
    }

    return profile?.email_verified || false
  } catch (error) {
    console.error('Error in checkEmailVerification:', error)
    return false
  }
}
