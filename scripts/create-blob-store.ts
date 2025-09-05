import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load environment variables from .env.local
const envPath = resolve(process.cwd(), '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const envVars: any = {}

envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim()
  }
})

const VERCEL_API_TOKEN = envVars.VERCEL_API_TOKEN
const VERCEL_PROJECT_ID = envVars.VERCEL_PROJECT_ID || 'prj_ALWAE3X32HhBvyzKSX83M396LmwC'
const VERCEL_TEAM_ID = envVars.VERCEL_TEAM_ID

async function createBlobStore() {
  if (!VERCEL_API_TOKEN) {
    console.error('❌ VERCEL_API_TOKEN not found in .env.local')
    return
  }

  const teamQuery = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''
  
  try {
    console.log('🚀 Creating Blob store for your project...')
    
    // Create a Blob store
    const response = await fetch(
      `https://api.vercel.com/v1/blob/stores${teamQuery}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VERCEL_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          name: 'numgate-tenant-pages'
        })
      }
    )

    const data = await response.json()

    if (!response.ok) {
      if (data.error?.code === 'store_already_exists') {
        console.log('✅ Blob store already exists, fetching token...')
        
        // List stores to get the token
        const listResponse = await fetch(
          `https://api.vercel.com/v1/blob/stores${teamQuery}`,
          {
            headers: {
              'Authorization': `Bearer ${VERCEL_API_TOKEN}`
            }
          }
        )
        
        const stores = await listResponse.json()
        const store = stores.stores?.find((s: any) => s.name === 'numgate-tenant-pages')
        
        if (store) {
          console.log('\n📝 Add this to your .env.local file:')
          console.log(`BLOB_READ_WRITE_TOKEN=[REDACTED - Check Vercel Dashboard]`) // ${store.token}`)
          console.log('\n✅ Also add this environment variable in Vercel Dashboard:')
          console.log('1. Go to your project settings')
          console.log('2. Navigate to Environment Variables')
          console.log('3. Add BLOB_READ_WRITE_TOKEN with the token above')
        }
        return
      }
      
      console.error('❌ Error:', data.error?.message || 'Failed to create Blob store')
      return
    }

    console.log('✅ Blob store created successfully!')
    console.log('\n📝 Add this to your .env.local file:')
    console.log(`BLOB_READ_WRITE_TOKEN=[REDACTED - Check Vercel Dashboard]`) // ${data.token}`)
    console.log('\n✅ Also add this environment variable in Vercel Dashboard:')
    console.log('1. Go to your project settings')
    console.log('2. Navigate to Environment Variables')
    console.log('3. Add BLOB_READ_WRITE_TOKEN with the token above')
    
  } catch (error) {
    console.error('❌ Error creating Blob store:', error)
  }
}

// Run the script
createBlobStore()