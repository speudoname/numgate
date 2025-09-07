import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * Generate a unique 6-character server ID for Postmark
 * Format: First 3 letters of slug + 3 random alphanumeric characters
 */
export function generateServerCode(slug: string): string {
  // Take first 3 characters of slug (padded if needed)
  const prefix = slug.substring(0, 3).toUpperCase().padEnd(3, 'X')
  
  // Generate 3 random alphanumeric characters
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let suffix = ''
  for (let i = 0; i < 3; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return prefix + suffix
}

/**
 * Create Postmark servers for a new tenant
 */
export async function createPostmarkServersForTenant(
  tenantId: string,
  tenantName: string,
  slug: string
): Promise<{ transactionalCode: string; broadcastCode: string } | null> {
  try {
    const accountToken = process.env.POSTMARK_ACCOUNT_TOKEN
    if (!accountToken) {
      console.error('POSTMARK_ACCOUNT_TOKEN not configured')
      return null
    }

    // Generate unique server codes
    const transactionalCode = generateServerCode(slug)
    const broadcastCode = generateServerCode(slug + 'bc') // Add 'bc' for broadcast

    // Create transactional server
    const transactionalResponse = await fetch('https://api.postmarkapp.com/servers', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Account-Token': accountToken
      },
      body: JSON.stringify({
        Name: `${tenantName} - Transactional`,
        Color: 'blue',
        SmtpApiActivated: true,
        RawEmailEnabled: false,
        DeliveryType: 'Live',
        InboundHookUrl: '',
        BounceHookUrl: '',
        OpenHookUrl: '',
        PostFirstOpenOnly: false,
        TrackOpens: true,
        TrackLinks: 'HtmlAndText',
        IncludeBounceContentInHook: true,
        EnableSmtpApiErrorHooks: false
      })
    })

    if (!transactionalResponse.ok) {
      const error = await transactionalResponse.text()
      console.error('Failed to create transactional server:', error)
      return null
    }

    const transactionalData = await transactionalResponse.json()

    // Create broadcast server
    const broadcastResponse = await fetch('https://api.postmarkapp.com/servers', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Account-Token': accountToken
      },
      body: JSON.stringify({
        Name: `${tenantName} - Broadcast`,
        Color: 'green',
        SmtpApiActivated: true,
        RawEmailEnabled: false,
        DeliveryType: 'Live',
        InboundHookUrl: '',
        BounceHookUrl: '',
        OpenHookUrl: '',
        PostFirstOpenOnly: false,
        TrackOpens: true,
        TrackLinks: 'HtmlAndText',
        IncludeBounceContentInHook: true,
        EnableSmtpApiErrorHooks: false
      })
    })

    if (!broadcastResponse.ok) {
      const error = await broadcastResponse.text()
      console.error('Failed to create broadcast server:', error)
      // Still return transactional if it was created
      return {
        transactionalCode,
        broadcastCode: ''
      }
    }

    const broadcastData = await broadcastResponse.json()

    // Store server IDs in tenant settings
    const { error: updateError } = await supabaseAdmin
      .from('tenants')
      .update({
        settings: {
          postmark: {
            transactional_server_id: transactionalData.ID,
            transactional_server_token: transactionalData.ApiTokens[0],
            transactional_server_code: transactionalCode,
            broadcast_server_id: broadcastData.ID,
            broadcast_server_token: broadcastData.ApiTokens[0],
            broadcast_server_code: broadcastCode,
            created_at: new Date().toISOString()
          }
        }
      })
      .eq('id', tenantId)

    if (updateError) {
      console.error('Failed to update tenant with Postmark settings:', updateError)
    }

    return {
      transactionalCode,
      broadcastCode
    }

  } catch (error) {
    console.error('Error creating Postmark servers:', error)
    return null
  }
}

/**
 * Check if a server code already exists
 */
export async function checkServerCodeExists(code: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .or(`settings->postmark->transactional_server_code.eq.${code},settings->postmark->broadcast_server_code.eq.${code}`)
      .single()
    
    return !!data && !error
  } catch (error) {
    return false
  }
}

/**
 * Generate a unique server code that doesn't exist
 */
export async function generateUniqueServerCode(slug: string, isBroadcast: boolean = false): Promise<string> {
  let attempts = 0
  const maxAttempts = 10
  
  while (attempts < maxAttempts) {
    const code = generateServerCode(slug + (isBroadcast ? 'bc' : '') + (attempts > 0 ? attempts : ''))
    const exists = await checkServerCodeExists(code)
    
    if (!exists) {
      return code
    }
    
    attempts++
  }
  
  // Fallback to timestamp-based code
  const timestamp = Date.now().toString(36).substring(-6).toUpperCase()
  return timestamp.padStart(6, 'X')
}