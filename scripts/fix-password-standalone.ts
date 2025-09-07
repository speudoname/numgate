import { createClient } from '@supabase/supabase-js'
import * as bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

async function fixPassword() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY // Fixed: SUPABASE_SERVICE_KEY not SUPABASE_SERVICE_ROLE_KEY
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL // Fixed: INITIAL_ADMIN_EMAIL not SUPER_ADMIN_EMAIL
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD // Fixed: INITIAL_ADMIN_PASSWORD not SUPER_ADMIN_PASSWORD

  if (!supabaseUrl || !supabaseServiceKey || !adminEmail || !adminPassword) {
    console.error('❌ Missing required environment variables')
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY, INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD')
    process.exit(1)
  }

  console.log('🔐 Resetting password for:', adminEmail)
  console.log('🌐 Supabase URL:', supabaseUrl)

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Hash the password
  const hashedPassword = await bcrypt.hash(adminPassword, 10)

  // Update the password
  const { data, error } = await supabase
    .from('users')
    .update({ password_hash: hashedPassword })
    .eq('email', adminEmail)
    .select()

  if (error) {
    console.error('❌ Failed to update password:', error)
    process.exit(1)
  }

  if (data && data.length > 0) {
    console.log('✅ Password successfully reset!')
    console.log('📧 Email:', adminEmail)
    console.log('🔑 Password: [from .env.local]')
    console.log('\n✨ You can now login at https://www.komunate.com')
  } else {
    console.error('❌ No user found with email:', adminEmail)
  }

  process.exit(0)
}

fixPassword().catch(console.error)