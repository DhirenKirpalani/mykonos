'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Shield, Search, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type User = {
  id: string
  email: string
  role: string
  created_at: string
}

const ROLES = [
  { value: 'customer', label: 'Customer', color: 'bg-gray-100 text-gray-800' },
  { value: 'staff', label: 'Staff', color: 'bg-blue-100 text-blue-800' },
  { value: 'admin', label: 'Admin', color: 'bg-red-100 text-red-800' },
]

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('users')
        .select('id, email, role, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Failed to fetch users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      setUpdatingUserId(userId)
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Not authenticated')
        return
      }

      const response = await fetch('/api/admin/users/update-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          user_id: userId,
          new_role: newRole
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update role')
      }

      toast.success('User role updated successfully')
      fetchUsers()
    } catch (error: any) {
      console.error('Failed to update user role:', error)
      toast.error(error.message || 'Failed to update user role')
    } finally {
      setUpdatingUserId(null)
    }
  }

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getRoleInfo = (role: string) => {
    return ROLES.find(r => r.value === role) || ROLES[0]
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage user roles and permissions
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Users Table */}
      <div className="rounded-lg border border-border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 w-48 rounded bg-gray-200" /></td>
                    <td className="px-6 py-4"><div className="h-6 w-20 rounded-full bg-gray-200" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-24 rounded bg-gray-200" /></td>
                    <td className="px-6 py-4"><div className="h-8 w-28 rounded bg-gray-200" /></td>
                  </tr>
                ))
              ) : !loading && filteredUsers.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-muted-foreground">{searchQuery ? 'No users found' : 'No users yet'}</td></tr>
              ) : filteredUsers.map((user) => {
                  const roleInfo = getRoleInfo(user.role)
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {user.email}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                          roleInfo.color
                        )}>
                          <Shield className="h-3 w-3" />
                          {roleInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="relative inline-block">
                          <select
                            value={user.role}
                            onChange={(e) => updateUserRole(user.id, e.target.value)}
                            disabled={updatingUserId === user.id}
                            className={cn(
                              "appearance-none rounded-md border border-input bg-background px-3 py-1.5 pr-8 text-sm font-medium transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                              updatingUserId === user.id && "cursor-wait"
                            )}
                          >
                            {ROLES.map((role) => (
                              <option key={role.value} value={role.value}>
                                {role.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {ROLES.map((role) => {
          const count = users.filter(u => u.role === role.value).length
          return (
            <div key={role.value} className="rounded-lg border border-border bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{role.label}</p>
                  <p className="mt-1 text-2xl font-bold">{count}</p>
                </div>
                <Shield className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
