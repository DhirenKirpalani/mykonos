import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    // Get access token from Authorization header or cookies
    let accessToken = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!accessToken) {
      const cookieStore = cookies()
      const allCookies = cookieStore.getAll()
      const authCookie = allCookies.find(c => c.name.includes('sb-') && c.name.includes('auth-token'))
      
      if (authCookie) {
        try {
          const authData = JSON.parse(authCookie.value)
          accessToken = authData.access_token || authData[0]
        } catch {
          accessToken = authCookie.value
        }
      }
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized - Not logged in' },
        { status: 401 }
      )
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the user making the request
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      )
    }

    // Check if the requesting user is an admin
    const { data: requestingUser, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (roleError || !requestingUser) {
      return NextResponse.json(
        { error: 'Failed to verify user role' },
        { status: 500 }
      )
    }

    if (requestingUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Only admins can update user roles' },
        { status: 403 }
      )
    }

    // Get the request body
    const body = await request.json()
    const { user_id, new_role } = body

    if (!user_id || !new_role) {
      return NextResponse.json(
        { error: 'user_id and new_role are required' },
        { status: 400 }
      )
    }

    // Validate the role
    const validRoles = ['customer', 'staff', 'admin']
    if (!validRoles.includes(new_role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Prevent self-demotion from admin
    if (user_id === user.id && requestingUser.role === 'admin' && new_role !== 'admin') {
      return NextResponse.json(
        { error: 'Cannot demote yourself from admin role' },
        { status: 400 }
      )
    }

    // Update the user's role
    const { error: updateError } = await supabase
      .from('users')
      .update({ role: new_role })
      .eq('id', user_id)

    if (updateError) {
      console.error('Failed to update user role:', updateError)
      return NextResponse.json(
        { error: updateError.message || 'Failed to update user role' },
        { status: 500 }
      )
    }

    // Log the role change (non-blocking)
    supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'update_user_role',
        details: {
          target_user_id: user_id,
          new_role: new_role,
          changed_by: user.email
        }
      })
      .then(({ error }) => {
        if (error) console.error('Failed to log audit:', error)
      })

    return NextResponse.json({ 
      success: true,
      message: 'User role updated successfully'
    })

  } catch (error: any) {
    console.error('Error updating user role:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update user role' },
      { status: 500 }
    )
  }
}
