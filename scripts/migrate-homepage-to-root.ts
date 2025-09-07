#!/usr/bin/env node
/**
 * Migration script to move all content from homepage/ folder to root
 * This is part of removing the homepage folder concept
 */

import { list, head, put, del } from '@vercel/blob'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

async function migrateHomepageToRoot() {
  console.log('🚀 Starting migration: Moving homepage content to root...')
  
  // Get all tenants
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('id, name, slug')
  
  if (error) {
    console.error('❌ Failed to fetch tenants:', error)
    return
  }
  
  if (!tenants || tenants.length === 0) {
    console.log('No tenants found')
    return
  }
  
  console.log(`Found ${tenants.length} tenants to migrate`)
  
  let successCount = 0
  let skipCount = 0
  let errorCount = 0
  
  for (const tenant of tenants) {
    console.log(`\n📁 Processing tenant: ${tenant.name} (${tenant.id})`)
    
    try {
      // List all files in homepage folder
      const homepagePrefix = `${tenant.id}/homepage/`
      const { blobs: homepageFiles } = await list({ prefix: homepagePrefix })
      
      if (homepageFiles.length === 0) {
        console.log(`  ⏭️  No homepage folder found, skipping`)
        skipCount++
        continue
      }
      
      console.log(`  📄 Found ${homepageFiles.length} files in homepage folder`)
      
      // Move each file from homepage to root
      for (const file of homepageFiles) {
        const oldPath = file.pathname
        const filename = oldPath.replace(homepagePrefix, '')
        const newPath = `${tenant.id}/${filename}`
        
        console.log(`  📦 Moving: ${filename}`)
        
        try {
          // Check if file already exists in root
          const existingFile = await head(newPath).catch(() => null)
          
          if (existingFile) {
            console.log(`    ⚠️  File already exists in root, skipping: ${filename}`)
            continue
          }
          
          // Fetch the content from old location
          const response = await fetch(file.url)
          const content = await response.text()
          
          // Save to new location (root)
          await put(newPath, content, {
            access: 'public',
            contentType: file.contentType || 'text/html',
            addRandomSuffix: false
          })
          
          // Delete from old location
          await del(file.url)
          
          console.log(`    ✅ Moved successfully`)
        } catch (err) {
          console.error(`    ❌ Failed to move ${filename}:`, err)
          errorCount++
        }
      }
      
      successCount++
      console.log(`  ✅ Tenant migration complete`)
      
    } catch (err) {
      console.error(`  ❌ Failed to process tenant ${tenant.id}:`, err)
      errorCount++
    }
  }
  
  console.log('\n' + '='.repeat(50))
  console.log('Migration Summary:')
  console.log(`✅ Successfully migrated: ${successCount} tenants`)
  console.log(`⏭️  Skipped (no homepage folder): ${skipCount} tenants`)
  console.log(`❌ Errors: ${errorCount}`)
  console.log('='.repeat(50))
  
  if (errorCount > 0) {
    console.log('\n⚠️  Some migrations failed. Please check the errors above.')
  } else {
    console.log('\n🎉 Migration completed successfully!')
    console.log('All homepage content has been moved to root.')
  }
}

// Run the migration
migrateHomepageToRoot().catch(console.error)