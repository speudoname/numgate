import { supabaseAdmin } from '../lib/supabase/server'
import { hashPassword } from '../lib/auth/password'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

async function resetAdminPassword() {
  try {
    const adminEmail = process.env.SUPER_ADMIN_EMAIL
    const adminPassword = process.env.SUPER_ADMIN_PASSWORD
    
    if (!adminEmail || !adminPassword) {
      console.error('❌ Missing SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD in .env.local')
      process.exit(1)
    }

    console.log(`🔐 Resetting password for: ${adminEmail}`)
    
    // Hash the password
    const hashedPassword = await hashPassword(adminPassword)
    
    // Update the user's password
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ password_hash: hashedPassword })
      .eq('email', adminEmail)
      .select()

    if (error) {
      console.error('❌ Failed to reset password:', error)
      process.exit(1)
    }

    if (data && data.length > 0) {
      console.log('✅ Password successfully reset!')
      console.log('📧 Email:', adminEmail)
      console.log('🔑 Password: [from .env.local]')
      console.log('\n✨ You can now login at https://www.komunate.com')
    } else {
      console.error('❌ User not found with email:', adminEmail)
    }
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

resetAdminPassword()