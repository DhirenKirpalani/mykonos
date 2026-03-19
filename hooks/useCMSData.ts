import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'

/**
 * Custom hook for CMS data fetching with caching
 * Prevents full page reloads when navigating between CMS sections
 */

export function useCMSProducts(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['cms-products', page, limit],
    queryFn: async () => {
      const start = (page - 1) * limit
      const end = start + limit - 1

      const { data, error, count } = await supabase
        .from('products')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(start, end)

      if (error) throw error
      return { products: data, total: count }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  })
}

export function useCMSOrders(page = 1, limit = 20, status?: string) {
  return useQuery({
    queryKey: ['cms-orders', page, limit, status],
    queryFn: async () => {
      const start = (page - 1) * limit
      const end = start + limit - 1

      let query = supabase
        .from('orders')
        .select('*, users(email, full_name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(start, end)

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error, count } = await query

      if (error) throw error
      return { orders: data, total: count }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes (orders change more frequently)
    gcTime: 5 * 60 * 1000,
  })
}

export function useCMSCustomers(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['cms-customers', page, limit],
    queryFn: async () => {
      const start = (page - 1) * limit
      const end = start + limit - 1

      const { data, error, count } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(start, end)

      if (error) throw error
      return { customers: data, total: count }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useCMSPromoCodes() {
  return useQuery({
    queryKey: ['cms-promo-codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useCMSSystemSettings() {
  return useQuery({
    queryKey: ['cms-system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('setting_key')

      if (error) throw error
      return data
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (settings rarely change)
    gcTime: 30 * 60 * 1000,
  })
}

/**
 * Prefetch data for faster navigation
 * Call this when user hovers over navigation links
 */
export function usePrefetchCMSData() {
  const queryClient = useQueryClient()

  const prefetchProducts = () => {
    queryClient.prefetchQuery({
      queryKey: ['cms-products', 1, 20],
      queryFn: async () => {
        const { data, error, count } = await supabase
          .from('products')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(0, 19)

        if (error) throw error
        return { products: data, total: count }
      },
    })
  }

  const prefetchOrders = () => {
    queryClient.prefetchQuery({
      queryKey: ['cms-orders', 1, 20],
      queryFn: async () => {
        const { data, error, count } = await supabase
          .from('orders')
          .select('*, users(email, full_name)', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(0, 19)

        if (error) throw error
        return { orders: data, total: count }
      },
    })
  }

  const prefetchCustomers = () => {
    queryClient.prefetchQuery({
      queryKey: ['cms-customers', 1, 20],
      queryFn: async () => {
        const { data, error, count } = await supabase
          .from('users')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(0, 19)

        if (error) throw error
        return { customers: data, total: count }
      },
    })
  }

  return {
    prefetchProducts,
    prefetchOrders,
    prefetchCustomers,
  }
}
