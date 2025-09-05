import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_KEY')
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      persistSession: false
    }
  }
)

async function applyMigration() {
  console.log('🔧 Applying Custom JWT Integration Migration...')
  console.log('')
  
  // Read the migration file
  const migrationPath = path.join(process.cwd(), 'supabase/migrations/007_custom_jwt_integration.sql')
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
  
  console.log('📋 Migration Instructions:')
  console.log('================================')
  console.log('Since direct SQL execution is restricted, please apply this migration manually:')
  console.log('')
  console.log('1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/hbopxprpgvrkucztsvnq')
  console.log('2. Click on "SQL Editor" in the left sidebar')
  console.log('3. Click "New Query"')
  console.log('4. Copy ALL the content from: supabase/migrations/007_custom_jwt_integration.sql')
  console.log('5. Paste it into the SQL editor')
  console.log('6. Click "Run" to execute the migration')
  console.log('')
  console.log('📝 What this migration does:')
  console.log('- Creates functions to read your custom JWT from request headers')
  console.log('- Updates all RLS policies to work with your custom JWT')
  console.log('- Enables proper database-level tenant isolation')
  console.log('')
  console.log('✅ After applying, your API routes can use anon keys with full RLS protection!')
  console.log('')
  
  // Save a clickable link version
  const dashboardUrl = `https://supabase.com/dashboard/project/hbopxprpgvrkucztsvnq/sql/new`
  console.log('🔗 Direct link to SQL Editor:')
  console.log(dashboardUrl)
  console.log('')
  
  // Also test if the functions already exist
  console.log('🔍 Checking if migration might already be applied...')
  
  try {
    const { data, error } = await supabase.rpc('get_auth_user_id')
    
    if (!error) {
      console.log('✅ Functions already exist! Migration may have been applied.')
    } else if (error.message.includes('not find')) {
      console.log('❌ Functions not found. Migration needs to be applied.')
    }
  } catch (e) {
    console.log('⚠️  Cannot verify migration status. Please check manually.')
  }
}

// Run
applyMigration()