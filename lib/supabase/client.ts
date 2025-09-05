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
  // Prepare headers for RLS
  const headers: Record<string, string> = {}
  
  if (request) {
    const tenantId = request.headers.get('x-tenant-id')
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role')
    
    // Create a JSON object for PostgreSQL to parse
    const requestHeaders = {
      'x-tenant-id': tenantId || '',
      'x-user-id': userId || '',
      'x-user-role': userRole || ''
    }
    
    // Pass as a custom header that PostgreSQL can read
    headers['x-custom-jwt-claims'] = JSON.stringify(requestHeaders)
  }
  
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers
      },
      db: {
        schema: 'public'
      }
    }
  )
  
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