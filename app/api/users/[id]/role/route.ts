import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

/**
 * Assign role to user
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: adminUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const { id: userId } = params
    const body = await request.json()
    const { role, reason } = body

    if (!role) {
      return NextResponse.json(
        { error: 'Role is required' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['customer', 'support_agent', 'inventory_manager', 'content_manager', 'marketing_manager', 'admin']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Use the database function to assign role
    const { error: assignError } = await supabase.rpc('assign_user_role', {
      p_user_id: userId,
      p_new_role: role,
      p_reason: reason || null,
    } as any)

    if (assignError) throw assignError

    // Get updated user
    const { data: updatedUser } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, role, role_assigned_at')
      .eq('id', userId)
      .single()

    return NextResponse.json({
      message: 'Role assigned successfully',
      user: updatedUser,
    })
  } catch (error: any) {
    console.error('Role assignment error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to assign role' },
      { status: 500 }
    )
  }
}
