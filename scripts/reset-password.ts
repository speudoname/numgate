import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcrypt'

// Load environment variables first
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// Create Supabase admin client directly
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function resetPassword() {
  const email = process.env.INITIAL_ADMIN_EMAIL || 'levan@sarke.ge'
  const newPassword = process.env.INITIAL_ADMIN_PASSWORD || 'levan0488'
  
  console.log('=== Resetting Password ===')
  console.log(`Email: ${email}`)
  console.log(`New Password: ${newPassword}`)
  console.log('')

  try {
    // Hash the new password
    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds)
    console.log('Password hashed successfully')
    
    // Update the user's password in the database
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ password_hash: hashedPassword })
      .eq('email', email)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating password:', error)
      return
    }
    
    console.log('✅ Password updated successfully!')
    console.log('User:', data.email)
    console.log('ID:', data.id)
    
    // Test the password
    console.log('\n=== Testing Password ===')
    const isValid = await bcrypt.compare(newPassword, hashedPassword)
    console.log('Password verification test:', isValid ? '✅ PASS' : '❌ FAIL')
    
    // Double check by fetching the user and comparing
    const { data: userCheck } = await supabaseAdmin
      .from('users')
      .select('password_hash')
      .eq('email', email)
      .single()
    
    if (userCheck) {
      const dbValid = await bcrypt.compare(newPassword, userCheck.password_hash)
      console.log('Database password verification:', dbValid ? '✅ PASS' : '❌ FAIL')
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

resetPassword().then(() => {
  console.log('\n=== Password reset complete ===')
  process.exit(0)
}).catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})