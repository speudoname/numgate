import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in environment variables')
  process.exit(1)
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function listAllTenants() {
  console.log('\n====================================')
  console.log('LISTING ALL TENANTS IN DATABASE')
  console.log('====================================\n')

  try {
    // Query all tenants
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('id, name, slug, email, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching tenants:', error.message)
      return
    }

    if (!tenants || tenants.length === 0) {
      console.log('No tenants found in the database.')
      return
    }

    console.log(`Found ${tenants.length} tenant(s):\n`)
    console.log('-----------------------------------')
    
    // Display each tenant
    tenants.forEach((tenant, index) => {
      console.log(`\nTenant #${index + 1}:`)
      console.log(`  ID:         ${tenant.id}`)
      console.log(`  Name:       ${tenant.name}`)
      console.log(`  Slug:       ${tenant.slug}`)
      console.log(`  Email:      ${tenant.email}`)
      console.log(`  Created:    ${new Date(tenant.created_at).toLocaleString()}`)
      console.log('-----------------------------------')
    })

    console.log('\n\n====================================')
    console.log('SUMMARY FOR BLOB PAGE CREATION')
    console.log('====================================\n')
    
    console.log('You can use these tenant IDs to create blob pages:\n')
    tenants.forEach(tenant => {
      console.log(`  - ${tenant.slug} (ID: ${tenant.id})`)
    })
    
    console.log('\nTo create default pages for a tenant, use:')
    console.log('  TenantPagesService.createDefaultPages(tenantId, tenantName, tenantSlug)')
    
  } catch (err) {
    console.error('Unexpected error:', err)
  }
}

// Run the script
listAllTenants().then(() => {
  console.log('\nScript completed.')
  process.exit(0)
})