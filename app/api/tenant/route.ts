import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { withUserAuth, AuthContext } from '@/lib/middleware/auth'
import { withErrorHandling } from '@/lib/errors/error-handler'
import { SharedApiResponse } from '@/lib/errors/shared-error-handler'

export const GET = withUserAuth(withErrorHandling(async (request: NextRequest, auth: AuthContext) => {
  const { tenantId, userId } = auth

  // Continue using admin client with explicit tenant filtering
  // RLS with custom JWT requires more complex Supabase setup
  const supabase = supabaseAdmin
    
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single()

  if (tenantError || !tenant) {
    return SharedApiResponse.notFound('Tenant not found')
  }

  // Get user information
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (userError || !user) {
    return SharedApiResponse.notFound('User not found')
  }

  // Get enabled apps
  const { data: apps, error: appsError } = await supabase
    .from('app_access')
    .select('*')
    .eq('tenant_id', tenantId)

  if (appsError) {
    return SharedApiResponse.internalError('Failed to fetch apps')
  }

  return SharedApiResponse.success({
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      email: tenant.email,
      subscription_plan: tenant.subscription_plan,
      custom_domains: tenant.custom_domains
    },
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      is_super_admin: user.is_super_admin || false
    },
    apps: apps || []
  })
}))