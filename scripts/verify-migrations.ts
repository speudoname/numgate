import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verifyMigrations() {
  console.log('🔍 Verifying database migrations...\n')
  
  try {
    // Check Migration 001: ssl_status column
    const { data: domains } = await supabase
      .from('custom_domains')
      .select('id, ssl_status')
      .limit(1)
    
    if (domains !== null) {
      console.log('✅ Migration 001: ssl_status column exists')
    } else {
      console.log('⚠️  Migration 001: Could not verify ssl_status column')
    }
    
    // Check Migration 002: is_primary column
    try {
      const { data: primaryCheck } = await supabase
        .from('custom_domains')
        .select('id, is_primary')
        .limit(1)
      
      if (primaryCheck !== null) {
        console.log('✅ Migration 002: is_primary column exists')
        
        // Show primary domains
        const { data: primaryDomains } = await supabase
          .from('custom_domains')
          .select('domain, is_primary')
          .eq('is_primary', true)
        
        if (primaryDomains && primaryDomains.length > 0) {
          console.log(`   Primary domains: ${primaryDomains.map(d => d.domain).join(', ')}`)
        }
      }
    } catch (error: any) {
      if (error.message?.includes('column') || error.code === '42703') {
        console.log('❌ Migration 002: is_primary column MISSING - needs to be applied')
      }
    }
    
    // Check Migration 003: tenant_users table
    const { data: tenantUsers } = await supabase
      .from('tenant_users')
      .select('id')
      .limit(1)
    
    if (tenantUsers !== null) {
      console.log('✅ Migration 003: tenant_users table exists')
      
      // Count users
      const { count } = await supabase
        .from('tenant_users')
        .select('*', { count: 'exact', head: true })
      
      console.log(`   Total tenant-user relationships: ${count || 0}`)
    } else {
      console.log('❌ Migration 003: tenant_users table MISSING')
    }
    
    console.log('\n📋 Summary:')
    console.log('If any migrations are missing, apply them via Supabase Dashboard SQL editor')
    console.log('Migration files are in: /supabase/migrations/')
    
  } catch (error) {
    console.error('Error verifying migrations:', error)
  }
}

verifyMigrations()