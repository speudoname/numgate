import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function addContactGateApp() {
  console.log('Adding ContactGate app to all tenants...')

  // Get all tenants
  const { data: tenants, error: tenantsError } = await supabase
    .from('tenants')
    .select('id, name')

  if (tenantsError) {
    console.error('Error fetching tenants:', tenantsError)
    return
  }

  console.log(`Found ${tenants?.length || 0} tenants`)

  // Add ContactGate app for each tenant
  for (const tenant of tenants || []) {
    console.log(`Adding ContactGate for tenant: ${tenant.name}`)

    // Check if app already exists
    const { data: existing } = await supabase
      .from('app_access')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('app_name', 'contacts')
      .single()

    if (existing) {
      console.log(`  - ContactGate already exists for ${tenant.name}`)
      continue
    }

    // Add ContactGate app access
    const { error: insertError } = await supabase
      .from('app_access')
      .insert({
        tenant_id: tenant.id,
        app_name: 'contacts',
        enabled: true, // Enable by default
        settings: {
          max_contacts: 10000, // Default limit
          features: {
            import_export: true,
            custom_fields: true,
            automation: false, // Can be enabled later
            api_access: false // Can be enabled later
          }
        }
      })

    if (insertError) {
      console.error(`  - Error adding ContactGate for ${tenant.name}:`, insertError)
    } else {
      console.log(`  - Successfully added ContactGate for ${tenant.name}`)
    }
  }

  console.log('Finished adding ContactGate app to all tenants')
}

// Run the script
addContactGateApp()
  .then(() => {
    console.log('Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })