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

async function checkCustomDomainsTable() {
  console.log('🔍 Checking custom_domains table structure...\n')
  
  try {
    // Try to query the table and check what columns are returned
    console.log('📊 Checking columns by querying the table...')
    
    const { data: sampleData, error: sampleError } = await supabase
      .from('custom_domains')
      .select('*')
      .limit(1)
    
    if (!sampleError && sampleData) {
      const sampleRow = sampleData[0] || {}
      console.log('📊 Columns found in custom_domains table:')
      const columnNames = Object.keys(sampleRow).length > 0 
        ? Object.keys(sampleRow) 
        : ['(empty table - showing expected columns)', 'id', 'tenant_id', 'domain', 'verified', 'verification_token', 'ssl_status', 'created_at', 'updated_at', 'is_primary']
      
      columnNames.forEach(col => {
        const hasColumn = sampleRow.hasOwnProperty(col) || columnNames[0].includes('empty')
        console.log(`   ${hasColumn ? '✅' : '❌'} ${col}`)
      })
      
      // Check specifically for updated_at column
      if (!columnNames.includes('updated_at')) {
        console.log('\n❌ ISSUE FOUND: updated_at column is MISSING!')
        console.log('   The trigger update_updated_at_column expects this column to exist.')
      }
      
      // Check specifically for is_primary column
      if (!columnNames.includes('is_primary')) {
        console.log('\n⚠️  is_primary column is MISSING - Migration 002 needs to be applied')
      }
    } else {
      console.log('❌ Could not query table:', sampleError?.message)
    }
    
    // Check triggers by testing an update
    console.log('\n🔧 Testing if update trigger works...')
    
    // Try to test if trigger works by doing an update
    const { data: testData } = await supabase
      .from('custom_domains')
      .select('id, domain, verified')
      .limit(1)
      .single()
    
    if (testData) {
      // Try updating with the same value to test trigger
      const { error: updateError } = await supabase
        .from('custom_domains')
        .update({ verified: testData.verified })
        .eq('id', testData.id)
      
      if (updateError) {
        console.log('❌ Update failed with error:', updateError.message)
        if (updateError.message.includes('updated_at')) {
          console.log('\n🔴 CRITICAL ISSUE: The trigger is trying to set updated_at but the column does not exist!')
          console.log('   This is the source of your "record new has no field updated_at" error')
        }
      } else {
        console.log('✅ Update succeeded - trigger appears to be working or not present')
      }
    } else {
      console.log('⚠️  No data to test with (table might be empty)')
    }
    
    console.log('\n📋 Summary and Recommendations:')
    console.log('1. If updated_at column is missing, add it with:')
    console.log('   ALTER TABLE custom_domains ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();')
    console.log('\n2. If is_primary column is missing, run Migration 002:')
    console.log('   Execute /supabase/migrations/002_add_primary_domain_flag.sql')
    console.log('\n3. If the trigger is causing issues, you can temporarily drop it:')
    console.log('   DROP TRIGGER IF EXISTS update_custom_domains_updated_at ON custom_domains;')
    
  } catch (error: any) {
    console.error('Error checking table structure:', error.message)
  }
}

checkCustomDomainsTable()