import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

// Update tenant details (active status, etc.)
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
    const { is_active, notes } = body

    // Update tenant
    const updateData: any = {}
    
    if (is_active !== undefined) {
      updateData.is_active = is_active
      if (!is_active) {
        updateData.suspended_at = new Date().toISOString()
      } else {
        updateData.suspended_at = null
      }
    }
    
    if (notes !== undefined) {
      updateData.notes = notes
    }

    const { data, error } = await supabaseAdmin
      .from('tenants')
      .update(updateData)
      .eq('id', params.tenantId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ tenant: data })
  } catch (error) {
    // Error logged server-side only
    return NextResponse.json(
      { error: 'Failed to update tenant' },
      { status: 500 }
    )
  }
}