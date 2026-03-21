'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import NewsletterManagement from '@/components/admin/NewsletterManagement'
import { supabase } from '@/lib/supabase/client'

export default function NewsletterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      setLoading(false)
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <NewsletterManagement />
    </div>
  )
}
