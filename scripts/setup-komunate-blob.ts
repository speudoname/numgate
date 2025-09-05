import { put, list, del } from '@vercel/blob'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

function generateKomunateHomepage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Komunate - Multi-Tenant SaaS Platform</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%);
      min-height: 100vh;
      color: white;
    }
    .header {
      padding: 2rem 4rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .logo {
      font-size: 2rem;
      font-weight: bold;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .nav {
      display: flex;
      gap: 2rem;
    }
    .nav a {
      color: white;
      text-decoration: none;
      opacity: 0.8;
      transition: opacity 0.3s;
    }
    .nav a:hover {
      opacity: 1;
    }
    .hero {
      padding: 6rem 4rem;
      text-align: center;
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      font-size: 4rem;
      margin-bottom: 1.5rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle {
      font-size: 1.5rem;
      opacity: 0.9;
      margin-bottom: 3rem;
      line-height: 1.6;
    }
    .cta-buttons {
      display: flex;
      gap: 1.5rem;
      justify-content: center;
      margin-bottom: 4rem;
    }
    .btn {
      padding: 1rem 2.5rem;
      border-radius: 50px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.3s ease;
      display: inline-block;
    }
    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
    }
    .btn-secondary {
      border: 2px solid #667eea;
      color: white;
    }
    .btn-secondary:hover {
      background: rgba(102, 126, 234, 0.1);
    }
    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 2rem;
      padding: 4rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    .feature {
      background: rgba(255,255,255,0.05);
      padding: 2rem;
      border-radius: 15px;
      border: 1px solid rgba(255,255,255,0.1);
      transition: all 0.3s ease;
    }
    .feature:hover {
      background: rgba(255,255,255,0.08);
      transform: translateY(-5px);
    }
    .feature h3 {
      font-size: 1.5rem;
      margin-bottom: 1rem;
      color: #667eea;
    }
    .feature p {
      opacity: 0.8;
      line-height: 1.6;
    }
    .info-banner {
      background: rgba(102, 126, 234, 0.1);
      border: 1px solid rgba(102, 126, 234, 0.3);
      border-radius: 10px;
      padding: 1.5rem;
      margin: 2rem auto;
      max-width: 800px;
      text-align: center;
    }
    .info-banner h3 {
      color: #667eea;
      margin-bottom: 0.5rem;
    }
    .footer {
      text-align: center;
      padding: 3rem;
      opacity: 0.6;
      border-top: 1px solid rgba(255,255,255,0.1);
      margin-top: 4rem;
    }
  </style>
</head>
<body>
  <header class="header">
    <div class="logo">KOMUNATE</div>
    <nav class="nav">
      <a href="/features">Features</a>
      <a href="/pricing">Pricing</a>
      <a href="/docs">Docs</a>
      <a href="/login">Login</a>
      <a href="/register">Get Started</a>
    </nav>
  </header>

  <main>
    <section class="hero">
      <h1>Build Your Multi-Tenant SaaS</h1>
      <p class="subtitle">
        Complete platform with AI-powered page builder, webinars, email marketing, and LMS.<br>
        Each tenant gets their own subdomain, custom domain support, and isolated data.
      </p>
      
      <div class="cta-buttons">
        <a href="/register" class="btn btn-primary">Start Free Trial</a>
        <a href="/login" class="btn btn-secondary">Sign In</a>
      </div>

      <div class="info-banner">
        <h3>🚀 Platform Status</h3>
        <p>This page is served from Blob Storage</p>
        <p>Tenant: Komunate Platform | Type: Enterprise</p>
      </div>
    </section>

    <section class="features">
      <div class="feature">
        <h3>🎨 AI Page Builder</h3>
        <p>Create stunning landing pages with AI assistance. No coding required.</p>
      </div>
      <div class="feature">
        <h3>🌐 Multi-Domain Support</h3>
        <p>Each tenant gets their subdomain. Add unlimited custom domains.</p>
      </div>
      <div class="feature">
        <h3>📧 Email Marketing</h3>
        <p>Built-in email campaigns with automation and analytics.</p>
      </div>
      <div class="feature">
        <h3>🎥 Webinar Platform</h3>
        <p>Host live webinars and automated evergreen events.</p>
      </div>
      <div class="feature">
        <h3>📚 LMS Integration</h3>
        <p>Create and sell online courses with built-in learning management.</p>
      </div>
      <div class="feature">
        <h3>🔒 Data Isolation</h3>
        <p>Complete tenant isolation with row-level security.</p>
      </div>
    </section>
  </main>

  <footer class="footer">
    <p>&copy; 2024 Komunate. Multi-Tenant SaaS Platform.</p>
    <p>Powered by NumGate Architecture</p>
  </footer>
</body>
</html>`
}

async function setupKomunateBlob() {
  console.log('🚀 Setting up Komunate tenant blob pages...\n')
  
  try {
    // Get the komunate tenant
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, name, slug')
      .eq('slug', 'komunate')
      .single()
    
    if (error || !tenant) {
      console.error('❌ Komunate tenant not found. Run create-komunate-tenant.ts first.')
      return
    }
    
    console.log(`✅ Found Komunate tenant:`)
    console.log(`   ID: ${tenant.id}`)
    console.log(`   Name: ${tenant.name}`)
    console.log(`   Slug: ${tenant.slug}\n`)
    
    // Check existing blobs
    const { blobs } = await list()
    const blobPath = `${tenant.id}/pages/index.html`
    const existingBlob = blobs.find(b => b.pathname === blobPath)
    
    if (existingBlob) {
      console.log('⚠️  Blob already exists, deleting old version...')
      await del(blobPath)
    }
    
    // Create the homepage
    console.log('📝 Creating Komunate homepage...')
    const content = generateKomunateHomepage()
    
    const blob = await put(blobPath, content, {
      access: 'public',
      contentType: 'text/html',
      addRandomSuffix: false,
      cacheControlMaxAge: 0,
    } as any)
    
    console.log('✅ Homepage created successfully!')
    console.log(`📍 URL: ${blob.url}`)
    console.log(`📊 Size: ${content.length} bytes`)
    
    console.log('\n✨ Komunate platform is now ready!')
    console.log('Visit http://localhost:3003 to see the platform homepage')
    
  } catch (error) {
    console.error('❌ Error setting up Komunate blob:', error)
  }
}

// Run the script
setupKomunateBlob()