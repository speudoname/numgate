import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { tenantId, serverType, serverName, serverToken } = await request.json()

    if (!tenantId || !serverType || !serverName || !serverToken) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Update the appropriate token column in ContactGate's postmark_settings
    const updateData: any = {}
    
    if (serverType === 'transactional') {
      // For dedicated transactional servers
      updateData.dedicated_transactional_token = serverToken
    } else if (serverType === 'marketing') {
      // For dedicated marketing servers
      updateData.dedicated_marketing_token = serverToken
    }

    // Also check if this is a shared server
    if (serverName.toLowerCase().includes('shared') || serverName.toLowerCase().includes('defaultshared')) {
      updateData.shared_server_token = serverToken
      updateData.server_mode = 'shared'
    } else {
      updateData.server_mode = 'dedicated'
    }

    updateData.updated_at = new Date().toISOString()

    // Update postmark_settings in ContactGate
    const { data, error } = await supabaseAdmin
      .from('postmark_settings')
      .update(updateData)
      .eq('tenant_id', tenantId)

    if (error) {
      console.error('Error updating postmark_settings:', error)
      
      // If no row exists, create one
      if (error.code === 'PGRST116') {
        const { data: insertData, error: insertError } = await supabaseAdmin
          .from('postmark_settings')
          .insert({
            tenant_id: tenantId,
            ...updateData,
            from_email: 'noreply@komunate.com',
            from_name: 'Komunate Platform'
          })

        if (insertError) {
          return NextResponse.json(
            { error: 'Failed to create postmark settings' },
            { status: 500 }
          )
        }
      } else {
        return NextResponse.json(
          { error: 'Failed to update postmark settings' },
          { status: 500 }
        )
      }
    }

    // Also update shared_postmark_config if this is the default shared server
    if (serverName.toLowerCase().includes('defaultshared') || serverName === 'defaultsharednumagte') {
      const { error: sharedError } = await supabaseAdmin
        .from('shared_postmark_config')
        .upsert({
          server_name: serverName,
          server_token: serverToken,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'server_name'
        })

      if (sharedError) {
        console.error('Error updating shared_postmark_config:', sharedError)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Token stored for ${serverType} server: ${serverName}`
    })

  } catch (error: any) {
    console.error('Store token error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to store token' },
      { status: 500 }
    )
  }
}