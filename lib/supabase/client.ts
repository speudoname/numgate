import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

/**
 * Create a Supabase client for server-side use with anon key
 * This respects RLS policies and should be used for ALL tenant operations
 * 
 * @param request - NextRequest to extract JWT claims from headers
 * @returns Supabase client with user context for RLS
 */
export function createServerClient(request?: NextRequest) {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: request ? {
          // Pass JWT claims for RLS policies
          'x-tenant-id': request.headers.get('x-tenant-id') || '',
          'x-user-id': request.headers.get('x-user-id') || '',
          'x-user-role': request.headers.get('x-user-role') || ''
        } : {}
      }
    }
  )
  
  // Set JWT claims for RLS if available
  if (request) {
    const tenantId = request.headers.get('x-tenant-id')
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role')
    
    // These will be available in RLS policies via current_setting()
    if (tenantId) client.rpc('set_config', { key: 'request.jwt.tenant_id', value: tenantId })
    if (userId) client.rpc('set_config', { key: 'request.jwt.user_id', value: userId })
    if (userRole) client.rpc('set_config', { key: 'request.jwt.user_role', value: userRole })
  }
  
  return client
}

/**
 * Browser-side Supabase client with anon key
 * For use in client components
 */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)