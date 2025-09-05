import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

// POST - Set domain as primary
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const tenantId = request.headers.get('x-tenant-id')
    // Use admin client since custom JWT doesn't integrate with RLS for domain operations
    const supabase = supabaseAdmin
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Start a transaction by first removing primary from all domains
    const { error: updateError } = await supabase
      .from('custom_domains')
      .update({ is_primary: false })
      .eq('tenant_id', tenantId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Set the selected domain as primary
    const { data: domain, error: setPrimaryError } = await supabase
      .from('custom_domains')
      .update({ 
        is_primary: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', resolvedParams.id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (setPrimaryError || !domain) {
      return NextResponse.json({ error: 'Failed to set primary domain' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: `${domain.domain} is now the primary domain`
    })
  } catch (error) {
    console.error('Error setting primary domain:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}