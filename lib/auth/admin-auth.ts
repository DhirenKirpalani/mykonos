import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export type AuthenticatedUser = {
  userId: string
  role: string
}

export type AuthResult =
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; response: NextResponse }

/**
 * Authenticate and authorize an admin/staff request.
 *
 * Verifies the Bearer token against Supabase Auth, then checks the user's
 * role in the `users` table. Allowed roles are configurable via `allowedRoles`.
 *
 * Usage:
 *   const auth = await verifyAdminAuth(request, ['admin', 'inventory_manager'])
 *   if (!auth.ok) return auth.response
 *   // auth.user.userId, auth.user.role
 */
export async function verifyAdminAuth(
  request: Request,
  allowedRoles: string[] = ['admin', 'inventory_manager']
): Promise<AuthResult> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const token = authHeader.substring(7)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userError || !userData || !allowedRoles.includes(userData.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      ),
    }
  }

  return {
    ok: true,
    user: { userId: user.id, role: userData.role },
  }
}

/**
 * Authenticate any logged-in user (no role restriction).
 */
export async function verifyUserAuth(request: Request): Promise<AuthResult> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const token = authHeader.substring(7)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userError || !userData) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  return {
    ok: true,
    user: { userId: user.id, role: userData.role },
  }
}
