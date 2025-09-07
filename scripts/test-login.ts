import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables first
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function testLogin() {
  const loginUrl = 'http://localhost:3002/api/auth/login'
  const email = process.env.INITIAL_ADMIN_EMAIL || 'levan@sarke.ge'
  const password = process.env.INITIAL_ADMIN_PASSWORD || 'levan0488'
  
  console.log('=== Testing Login ===')
  console.log(`URL: ${loginUrl}`)
  console.log(`Email: ${email}`)
  console.log('Password: [HIDDEN]')
  console.log('')

  try {
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'host': 'localhost:3000'
      },
      body: JSON.stringify({
        email,
        password
      })
    })

    const data = await response.json()
    
    console.log('Response Status:', response.status)
    console.log('Response Headers:')
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        console.log(`  ${key}: [COOKIE SET]`)
      } else {
        console.log(`  ${key}: ${value}`)
      }
    })
    console.log('')
    console.log('Response Body:')
    console.log(JSON.stringify(data, null, 2))

    if (response.ok && data.success) {
      console.log('\n✅ LOGIN SUCCESSFUL!')
      console.log('Token received:', data.token ? 'Yes' : 'No')
      console.log('Redirect URL:', data.redirectUrl)
      console.log('User:', data.user)
      console.log('Tenant:', data.tenant)
    } else {
      console.log('\n❌ LOGIN FAILED')
      console.log('Error:', data.error)
      if (data.details) {
        console.log('Details:', JSON.stringify(data.details, null, 2))
      }
    }
  } catch (error) {
    console.error('\n❌ REQUEST FAILED')
    console.error('Error:', error)
  }
}

testLogin().then(() => {
  console.log('\n=== Test Complete ===')
  process.exit(0)
}).catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})