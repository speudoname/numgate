import { list, head, del, put } from '@vercel/blob'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function migrateBlobs() {
  console.log('🚀 Starting blob migration to new folder structure...\n')
  
  try {
    // Get all tenants
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('id, name, slug')
    
    if (error || !tenants) {
      console.error('❌ Error fetching tenants:', error)
      return
    }
    
    console.log(`📋 Found ${tenants.length} tenants to migrate\n`)
    
    let migratedCount = 0
    let skippedCount = 0
    
    for (const tenant of tenants) {
      console.log(`\n🏢 Processing tenant: ${tenant.name} (${tenant.id})`)
      
      // List all blobs in the old 'pages' folder
      const oldPrefix = `${tenant.id}/pages/`
      const { blobs: oldBlobs } = await list({ prefix: oldPrefix })
      
      if (oldBlobs.length === 0) {
        console.log(`  ⏩ No pages found in old structure, skipping...`)
        skippedCount++
        continue
      }
      
      console.log(`  📄 Found ${oldBlobs.length} pages to migrate`)
      
      for (const blob of oldBlobs) {
        const pagePath = blob.pathname.replace(oldPrefix, '')
        console.log(`    📦 Migrating: ${pagePath}`)
        
        try {
          // Fetch the content
          const response = await fetch(blob.url)
          const content = await response.text()
          const contentType = response.headers.get('content-type') || 'text/html'
          
          // Store in new location (homepage folder)
          const newPath = `${tenant.id}/homepage/${pagePath}`
          await put(newPath, content, {
            access: 'public',
            contentType,
            addRandomSuffix: false,
          })
          
          // Delete the old blob
          await del(blob.pathname)
          
          console.log(`    ✅ Migrated to: homepage/${pagePath}`)
          migratedCount++
        } catch (error) {
          console.error(`    ❌ Error migrating ${pagePath}:`, error)
        }
      }
    }
    
    console.log(`\n✨ Migration complete!`)
    console.log(`   📊 Migrated: ${migratedCount} pages`)
    console.log(`   ⏩ Skipped: ${skippedCount} tenants (no pages)`)
    
    // Verify migration by checking new structure
    console.log(`\n🔍 Verifying migration...`)
    for (const tenant of tenants.slice(0, 3)) { // Check first 3 tenants
      const newPrefix = `${tenant.id}/homepage/`
      const { blobs: newBlobs } = await list({ prefix: newPrefix })
      
      if (newBlobs.length > 0) {
        console.log(`   ✅ ${tenant.name}: ${newBlobs.length} pages in homepage folder`)
      }
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
  }
}

// Run the migration
migrateBlobs()