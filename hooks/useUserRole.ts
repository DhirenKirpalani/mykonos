import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/types/roles'

export function useUserRole() {
  const [role, setRole] = useState<UserRole>('customer')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setRole('customer')
          setIsLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        if (error || !data) {
          setRole('customer')
        } else {
          setRole((data as any).role as UserRole)
        }
      } catch (error) {
        console.error('Error fetching user role:', error)
        setRole('customer')
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserRole()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserRole()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { role, isLoading }
}
