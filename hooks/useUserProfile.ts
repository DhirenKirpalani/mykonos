import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

export interface UserProfile {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  phone: string | null
}

export function useUserProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadProfile = async () => {
      if (!user || user.is_anonymous) {
        setProfile(null)
        setIsLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, phone')
        .eq('id', user.id)
        .single()

      if (data && !error) {
        setProfile(data)
      } else {
        // Fallback to user metadata
        setProfile({
          id: user.id,
          first_name: user.user_metadata?.first_name || null,
          last_name: user.user_metadata?.last_name || null,
          email: user.email || '',
          phone: user.user_metadata?.phone || null,
        })
      }
      setIsLoading(false)
    }

    loadProfile()
  }, [user])

  const getInitials = () => {
    if (!profile) return null
    const first = profile.first_name?.charAt(0)?.toUpperCase() || ''
    const last = profile.last_name?.charAt(0)?.toUpperCase() || ''
    return first && last ? `${first}${last}` : first || last || null
  }

  return { profile, isLoading, getInitials }
}
