import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export function useWishlistCount() {
  const [count, setCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const fetchWishlistCount = async () => {
    try {
      // Get session (anonymous or authenticated)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        setCount(0)
        setIsLoading(false)
        return
      }

      // Skip anonymous users - wishlist only for registered users
      if (session.user.is_anonymous) {
        setCount(0)
        setIsLoading(false)
        return
      }

      // Fetch wishlist count from database
      const { data, error } = await supabase
        .from('wishlist_items')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id)

      if (error) throw error

      setCount(data?.length || 0)
    } catch (error) {
      console.error('Failed to fetch wishlist count:', error)
      setCount(0)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchWishlistCount()

    // Listen for wishlist updates via custom events
    const handleWishlistUpdate = () => fetchWishlistCount()
    window.addEventListener('wishlist-updated', handleWishlistUpdate)

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchWishlistCount()
    })

    return () => {
      window.removeEventListener('wishlist-updated', handleWishlistUpdate)
      subscription.unsubscribe()
    }
  }, [])

  return { count, isLoading, refresh: fetchWishlistCount }
}
