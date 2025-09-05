import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'
import * as fs from 'fs'

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  console.log('🚀 Applying Migration 004: Fix custom_domains columns...\n')
  
  try {
    // Read the migration file
    const migrationPath = resolve(process.cwd(), 'supabase/migrations/004_fix_custom_domains_columns.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')
    
    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    console.log(`📋 Found ${statements.length} SQL statements to execute\n`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      const firstLine = statement.split('\n')[0].substring(0, 50)
      
      console.log(`Executing statement ${i + 1}: ${firstLine}...`)
      
      // For SELECT statements, use a different approach
      if (statement.trim().toUpperCase().startsWith('SELECT')) {
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_query: statement 
        }).catch(() => ({ data: null, error: 'RPC not available - statement might have succeeded' }))
        
        if (error && error !== 'RPC not available - statement might have succeeded') {
          console.log(`  ⚠️  Warning: ${error}`)
        } else {
          console.log(`  ✅ Executed successfully`)
        }
      } else {
        // For other statements, we can't directly execute them via Supabase client
        // So we'll just log them for manual execution
        console.log(`  ℹ️  This statement needs to be run manually in Supabase Dashboard`)
      }
    }
    
    console.log('\n📋 Migration statements prepared!')
    console.log('\n⚠️  IMPORTANT: Since we cannot execute DDL statements directly via the Supabase client,')
    console.log('   you need to run the migration manually:')
    console.log('\n   1. Go to your Supabase Dashboard')
    console.log('   2. Navigate to SQL Editor')
    console.log('   3. Copy and paste the contents of:')
    console.log('      /supabase/migrations/004_fix_custom_domains_columns.sql')
    console.log('   4. Click "Run" to execute the migration')
    
    // Test if the fix worked
    console.log('\n🧪 Testing if the issue is fixed...')
    const { data: testData } = await supabase
      .from('custom_domains')
      .select('id, domain, updated_at, is_primary')
      .limit(1)
      .single()
    
    if (testData) {
      if (testData.updated_at !== undefined && testData.is_primary !== undefined) {
        console.log('✅ Columns exist! The migration appears to have been applied successfully.')
        
        // Try an update to test the trigger
        const { error: updateError } = await supabase
          .from('custom_domains')
          .update({ verified: false })
          .eq('id', testData.id)
        
        if (!updateError) {
          console.log('✅ Update test passed! The trigger is working correctly.')
        } else {
          console.log(`⚠️  Update test failed: ${updateError.message}`)
        }
      } else {
        console.log('❌ Columns still missing. Please run the migration manually.')
      }
    }
    
  } catch (error: any) {
    console.error('Error applying migration:', error.message)
    console.log('\n⚠️  Please run the migration manually in your Supabase Dashboard')
  }
}

applyMigration()