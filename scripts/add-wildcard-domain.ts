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

async function addWildcardDomain() {
  if (!VERCEL_API_TOKEN) {
    console.error('❌ VERCEL_API_TOKEN not found in .env.local')
    return
  }

  const domain = '*.komunate.com'
  const teamQuery = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''
  
  try {
    console.log(`🚀 Adding wildcard domain ${domain} to Vercel project...`)
    
    const response = await fetch(
      `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains${teamQuery}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VERCEL_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          name: domain,
          gitBranch: null
        })
      }
    )

    const data = await response.json()

    if (!response.ok) {
      if (data.error?.code === 'domain_already_exists') {
        console.log(`✅ Wildcard domain ${domain} already exists in project`)
        return
      }
      console.error('❌ Error:', data.error?.message || 'Failed to add domain')
      console.error('Full response:', JSON.stringify(data, null, 2))
      return
    }

    console.log(`✅ Successfully added ${domain} to Vercel!`)
    console.log('\n📝 Next steps:')
    console.log('1. Add this DNS record at your domain provider:')
    console.log('   Type: CNAME')
    console.log('   Name: *')
    console.log('   Value: cname.vercel-dns.com')
    console.log('\n2. Wait 5-30 minutes for DNS propagation')
    console.log('\n3. Test by visiting: test.komunate.com')
    
    if (data.verification && data.verification.length > 0) {
      console.log('\n⚠️  Verification may be required:')
      data.verification.forEach((v: any) => {
        console.log(`   ${v.type} record: ${v.domain} → ${v.value}`)
      })
    }
  } catch (error) {
    console.error('❌ Error adding wildcard domain:', error)
  }
}

// Run the script
addWildcardDomain()