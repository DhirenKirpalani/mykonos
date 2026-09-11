import { supabase } from '@/lib/supabase/client'

/**
 * Wrapper around fetch() that automatically adds the Supabase auth token
 * to the Authorization header. Use this for all CMS/admin API calls.
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession()
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> || {}),
  }
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }
  if (init?.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }
  return fetch(input, {
    ...init,
    headers,
  })
}
