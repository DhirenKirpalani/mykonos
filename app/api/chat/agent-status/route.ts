import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Check if any admin/agent is currently online
 * For now, we'll check if there are any admin users in the system
 * In the future, this can be enhanced with actual presence tracking
 */
export async function GET() {
  try {
    const supabase = createClient()
    
    // Check if there are any admin users
    const { data: admins, error } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')
      .limit(1)

    // If table doesn't exist (PGRST205), return offline status without error
    if (error?.code === 'PGRST205') {
      return NextResponse.json({ isOnline: false })
    }

    if (error) throw error

    // For now, return online if there are any admins in the system
    // In the future, implement actual presence tracking
    const isOnline = admins && admins.length > 0

    return NextResponse.json({ isOnline })
  } catch (error: any) {
    console.error('Agent status check error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check agent status', isOnline: false },
      { status: 500 }
    )
  }
}
