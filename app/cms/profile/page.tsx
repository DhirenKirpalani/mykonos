'use client'

import { useState, useEffect } from 'react'
import { User, Mail, Calendar, Shield, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface UserProfile {
  id: string
  email: string
  role: string
  created_at: string
  full_name?: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Try to get user data from users table
      const { data, error } = await supabase
        .from('users')
        .select('id, email, role, created_at')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error fetching from users table:', error)
        // Fallback to auth user data
        setProfile({
          id: user.id,
          email: user.email || '',
          role: 'customer', // Default role
          created_at: user.created_at || new Date().toISOString()
        })
      } else {
        setProfile(data as UserProfile)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
      toast.success('Logged out successfully')
    } catch (error) {
      console.error('Error logging out:', error)
      toast.error('Failed to log out')
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'staff':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'marketing_manager':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'support_agent':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'inventory_manager':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'content_manager':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRoleDisplayName = (role: string) => {
    return role
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Loading profile...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Profile not found</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="mt-2 text-gray-600">Manage your account information</p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-luxury-gold/10">
              <User className="h-10 w-10 text-luxury-gold" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                {profile.full_name || profile.email.split('@')[0]}
              </h2>
              <div className="mt-2 flex items-center gap-2">
                <Shield className="h-4 w-4 text-gray-500" />
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${getRoleBadgeColor(
                    profile.role
                  )}`}
                >
                  {getRoleDisplayName(profile.role)}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Account Information</h3>
            
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-500">Email</p>
                <p className="mt-1 text-gray-900">{profile.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-500">Member Since</p>
                <p className="mt-1 text-gray-900">
                  {new Date(profile.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Role Permissions</h3>
            
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-600 mb-3">
                Your <strong>{getRoleDisplayName(profile.role)}</strong> role grants you access to:
              </p>
              <ul className="space-y-2 text-sm text-gray-700">
                {profile.role === 'admin' && (
                  <>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span> Full system access
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span> Role management
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span> System settings & kill switches
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span> Audit logs
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span> All CMS features
                    </li>
                  </>
                )}
                {profile.role === 'staff' && (
                  <>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span> Product management
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span> Order management
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span> Promo code management
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span> Customer support
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span> Basic analytics
                    </li>
                  </>
                )}
                {profile.role === 'customer' && (
                  <>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span> Shopping features
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span> Order history
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span> Wishlist
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span> Profile management
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {profile.role !== 'admin' && (
        <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
          <div className="flex gap-3">
            <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Need More Access?</h4>
              <p className="mt-1 text-sm text-blue-700">
                Contact an administrator to request role changes or additional permissions.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
