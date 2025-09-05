import { list } from '@vercel/blob'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

async function checkBlobs() {
  console.log('🔍 Checking Vercel Blob Storage...\n')
  
  try {
    const { blobs } = await list()
    console.log(`📊 Total blobs: ${blobs.length}`)
    
    if (blobs.length === 0) {
      console.log('❌ No blobs found! Need to run setup scripts.')
      return
    }
    
    // Group by tenant
    const tenantBlobs: Record<string, string[]> = {}
    
    for (const blob of blobs) {
      const parts = blob.pathname.split('/')
      const tenantId = parts[0]
      
      if (!tenantBlobs[tenantId]) {
        tenantBlobs[tenantId] = []
      }
      tenantBlobs[tenantId].push(blob.pathname)
    }
    
    console.log('\n📁 Blobs organized by tenant:')
    for (const [tenantId, paths] of Object.entries(tenantBlobs)) {
      console.log(`\n🏢 Tenant: ${tenantId}`)
      paths.forEach(path => {
        console.log(`   📄 ${path}`)
      })
    }
    
    // Check for specific important blobs
    console.log('\n🔍 Checking for key blobs:')
    const komunateTenantId = '071e262d-4d17-4b94-a728-24aed6dd0957'
    const aiTenantId = 'cd942d7d-17c0-46e6-b1ef-01b0343c2b99'
    
    const komunateIndex = blobs.find(b => b.pathname.includes(komunateTenantId) && b.pathname.includes('index.html'))
    const aiIndex = blobs.find(b => b.pathname.includes(aiTenantId) && b.pathname.includes('index.html'))
    
    console.log(`   Komunate index: ${komunateIndex ? '✅ Found' : '❌ Missing'}`)
    console.log(`   AI Academy index: ${aiIndex ? '✅ Found' : '❌ Missing'}`)
    
  } catch (error) {
    console.error('❌ Error checking blobs:', error)
  }
}

checkBlobs()