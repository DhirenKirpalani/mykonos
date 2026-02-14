import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export function useCartCount() {
  const [count, setCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const fetchCartCount = async () => {
    try {
      // Get session (anonymous or authenticated)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        // No session, check cached cart
        const cachedCart = localStorage.getItem('cached_cart')
        if (cachedCart) {
          const parsedCart = JSON.parse(cachedCart)
          const totalItems = parsedCart.reduce((sum: number, item: any) => sum + item.quantity, 0)
          setCount(totalItems)
        } else {
          setCount(0)
        }
        setIsLoading(false)
        return
      }

      // Fetch cart count from database
      const { data, error } = await supabase
        .from('cart_items')
        .select('quantity')
        .eq('user_id', session.user.id)

      if (error) throw error

      const totalItems = (data || []).reduce((sum, item: any) => sum + item.quantity, 0)
      setCount(totalItems)
    } catch (error) {
      console.error('Failed to fetch cart count:', error)
      setCount(0)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCartCount()

    // Listen for cart updates via custom events
    const handleCartUpdate = () => fetchCartCount()
    window.addEventListener('cart-updated', handleCartUpdate)

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchCartCount()
    })

    return () => {
      window.removeEventListener('cart-updated', handleCartUpdate)
      subscription.unsubscribe()
    }
  }, [])

  return { count, isLoading, refresh: fetchCartCount }
}
