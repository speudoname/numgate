import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

// Update app access for a tenant
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ tenantId: string }> }
) {
  try {
    // Await params as it's now a Promise in Next.js 15
    const params = await context.params
    
    // Verify super admin
    const isSuperAdmin = request.headers.get('x-is-super-admin')
    
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { app_name, enabled, limits, expires_at } = body

    if (!app_name) {
      return NextResponse.json({ error: 'App name is required' }, { status: 400 })
    }

    // Check if app access record exists
    const { data: existing } = await supabaseAdmin
      .from('app_access')
      .select('id')
      .eq('tenant_id', params.tenantId)
      .eq('app_name', app_name)
      .single()

    let result

    if (existing) {
      // Update existing record
      const updateData: any = { enabled }
      
      if (limits !== undefined) {
        updateData.limits = limits
      }
      
      if (expires_at !== undefined) {
        updateData.expires_at = expires_at
      }

      const { data, error } = await supabaseAdmin
        .from('app_access')
        .update(updateData)
        .eq('tenant_id', params.tenantId)
        .eq('app_name', app_name)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      // Create new record
      const { data, error } = await supabaseAdmin
        .from('app_access')
        .insert({
          tenant_id: params.tenantId,
          app_name,
          enabled,
          limits: limits || {},
          expires_at: expires_at || null
        })
        .select()
        .single()

      if (error) throw error
      result = data
    }

    return NextResponse.json({ app_access: result })
  } catch (error) {
    // Error logged server-side only
    return NextResponse.json(
      { error: 'Failed to update app access' },
      { status: 500 }
    )
  }
}