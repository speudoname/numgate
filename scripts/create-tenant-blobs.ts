import { put, list, del } from '@vercel/blob'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Different themes for each tenant to make it visually distinct
const themes = {
  'ai': {
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    primaryColor: '#667eea',
    title: 'AI Academy',
    description: 'Welcome to AI Academy - Learn the Future of Technology',
    specialMessage: 'Explore cutting-edge AI courses and workshops'
  },
  'nebiswera': {
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    primaryColor: '#f5576c', 
    title: 'Nebiswera',
    description: 'Welcome to Nebiswera - Your Digital Partner',
    specialMessage: 'Building digital solutions for tomorrow'
  },
  'nebiti': {
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    primaryColor: '#4facfe',
    title: 'Nebiti',
    description: 'Welcome to Nebiti - Innovation Starts Here',
    specialMessage: 'Transforming ideas into reality'
  }
}

function generateUniqueIndexPage(tenantName: string, tenantSlug: string, tenantId: string): string {
  const theme = themes[tenantSlug as keyof typeof themes] || {
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    primaryColor: '#667eea',
    title: tenantName,
    description: `Welcome to ${tenantName}`,
    specialMessage: 'Your website is being set up'
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${theme.title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: ${theme.gradient};
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .container {
      text-align: center;
      padding: 3rem;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
      border: 1px solid rgba(255, 255, 255, 0.18);
      max-width: 700px;
      margin: 0 20px;
    }
    h1 {
      font-size: 3.5rem;
      margin-bottom: 1rem;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
      animation: fadeInUp 0.8s ease;
    }
    .subtitle {
      font-size: 1.5rem;
      margin-bottom: 1rem;
      opacity: 0.95;
      animation: fadeInUp 0.8s ease 0.2s both;
    }
    .special-message {
      font-size: 1.2rem;
      margin-bottom: 2rem;
      opacity: 0.9;
      font-style: italic;
      animation: fadeInUp 0.8s ease 0.4s both;
    }
    .info-box {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 10px;
      padding: 1.5rem;
      margin: 2rem 0;
      animation: fadeInUp 0.8s ease 0.6s both;
    }
    .info-item {
      margin: 0.5rem 0;
      font-size: 0.95rem;
    }
    .info-label {
      font-weight: 600;
      opacity: 0.9;
    }
    .info-value {
      font-family: 'Courier New', monospace;
      background: rgba(0,0,0,0.2);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.9rem;
    }
    .btn {
      display: inline-block;
      padding: 14px 35px;
      background: white;
      color: ${theme.primaryColor};
      text-decoration: none;
      border-radius: 50px;
      font-weight: 600;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px 0 rgba(31, 38, 135, 0.2);
      margin-top: 1rem;
      animation: fadeInUp 0.8s ease 0.8s both;
    }
    .btn:hover {
      transform: translateY(-3px);
      box-shadow: 0 6px 20px 0 rgba(31, 38, 135, 0.3);
    }
    .footer {
      margin-top: 3rem;
      font-size: 0.9rem;
      opacity: 0.7;
      animation: fadeInUp 0.8s ease 1s both;
    }
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .tenant-badge {
      display: inline-block;
      background: ${theme.primaryColor};
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 0.85rem;
      margin-bottom: 1rem;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.8; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="tenant-badge">Tenant: ${tenantSlug.toUpperCase()}</div>
    <h1>${theme.title}</h1>
    <p class="subtitle">${theme.description}</p>
    <p class="special-message">${theme.specialMessage}</p>
    
    <div class="info-box">
      <h3 style="margin-bottom: 1rem;">Tenant Information</h3>
      <div class="info-item">
        <span class="info-label">Organization:</span> 
        <span class="info-value">${tenantName}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Tenant ID:</span> 
        <span class="info-value">${tenantId.slice(0, 8)}...</span>
      </div>
      <div class="info-item">
        <span class="info-label">Subdomain:</span> 
        <span class="info-value">${tenantSlug}.komunate.com</span>
      </div>
      <div class="info-item">
        <span class="info-label">Status:</span> 
        <span class="info-value">✅ Active</span>
      </div>
    </div>
    
    <a href="/admin" class="btn">Go to Admin Panel</a>
    
    <div class="footer">
      <p>This is a unique page for ${tenantName}</p>
      <p style="margin-top: 0.5rem; font-size: 0.8rem;">Powered by NumGate • Served from Blob Storage</p>
    </div>
  </div>
</body>
</html>`
}

async function createTenantBlobs() {
  console.log('🚀 Creating unique blob pages for each tenant...\n')
  
  try {
    // Get all tenants
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('id, name, slug')
    
    if (error || !tenants) {
      console.error('❌ Failed to fetch tenants:', error)
      return
    }
    
    console.log(`Found ${tenants.length} tenants:\n`)
    
    // List existing blobs
    console.log('📦 Checking existing blobs...')
    const { blobs } = await list()
    console.log(`Found ${blobs.length} existing blobs\n`)
    
    // Create a unique page for each tenant
    for (const tenant of tenants) {
      console.log(`\n📝 Processing tenant: ${tenant.name} (${tenant.slug})`)
      console.log(`   ID: ${tenant.id}`)
      
      const blobPath = `${tenant.id}/pages/index.html`
      const existingBlob = blobs.find(b => b.pathname === blobPath)
      
      if (existingBlob) {
        console.log(`   ⚠️  Blob already exists at: ${blobPath}`)
        console.log(`   🗑️  Deleting existing blob...`)
        await del(blobPath)
        console.log(`   ✨ Creating new blob with unique content...`)
      } else {
        console.log(`   ✨ Creating new blob at: ${blobPath}`)
      }
      
      // Generate unique content for this tenant
      const content = generateUniqueIndexPage(tenant.name, tenant.slug, tenant.id)
      
      // Store the page
      const blob = await put(blobPath, content, {
        access: 'public',
        contentType: 'text/html',
        addRandomSuffix: false,
        cacheControlMaxAge: 0, // Don't cache for testing
      } as any)
      
      console.log(`   ✅ Blob created/updated successfully!`)
      console.log(`   📍 URL: ${blob.url}`)
      console.log(`   📊 Size: ${content.length} bytes`)
    }
    
    // List all blobs again to verify
    console.log('\n\n📋 Final blob inventory:')
    const { blobs: finalBlobs } = await list()
    
    const tenantBlobs = finalBlobs.filter(b => b.pathname.includes('/pages/'))
    console.log(`Total tenant page blobs: ${tenantBlobs.length}`)
    
    tenantBlobs.forEach(blob => {
      const tenantId = blob.pathname.split('/')[0]
      const tenant = tenants.find(t => t.id === tenantId)
      console.log(`  • ${tenant?.name || 'Unknown'}: ${blob.pathname} (${blob.size} bytes)`)
    })
    
    console.log('\n✅ All tenant blobs created successfully!')
    console.log('\nYou can now visit:')
    tenants.forEach(tenant => {
      console.log(`  • ${tenant.slug}.komunate.com - Should show "${tenant.name}" with unique theme`)
    })
    
  } catch (error) {
    console.error('❌ Error creating tenant blobs:', error)
  }
}

// Run the script
createTenantBlobs()