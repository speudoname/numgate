import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { supabaseAdmin } from '../lib/supabase/server'

async function checkDatabase() {
  console.log('=== Checking Supabase Database Structure ===\n')

  try {
    // 1. Check users table
    console.log('1. USERS TABLE:')
    console.log('---------------')
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('*')
      .limit(10)

    if (usersError) {
      console.error('Error fetching users:', usersError)
    } else {
      console.log(`Found ${users?.length || 0} users`)
      if (users && users.length > 0) {
        console.log('Sample user structure:')
        console.log(JSON.stringify(users[0], null, 2))
        console.log('\nAll users:')
        users.forEach(user => {
          console.log(`- ${user.email} (ID: ${user.id})`)
        })
      }
    }

    // 2. Check tenants table
    console.log('\n2. TENANTS TABLE:')
    console.log('-----------------')
    const { data: tenants, error: tenantsError } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .limit(10)

    if (tenantsError) {
      console.error('Error fetching tenants:', tenantsError)
    } else {
      console.log(`Found ${tenants?.length || 0} tenants`)
      if (tenants && tenants.length > 0) {
        console.log('Sample tenant structure:')
        console.log(JSON.stringify(tenants[0], null, 2))
        console.log('\nAll tenants:')
        tenants.forEach(tenant => {
          console.log(`- ${tenant.name} (ID: ${tenant.id}, Slug: ${tenant.slug})`)
        })
      }
    }

    // 3. Check tenant_users table
    console.log('\n3. TENANT_USERS TABLE:')
    console.log('----------------------')
    const { data: tenantUsers, error: tenantUsersError } = await supabaseAdmin
      .from('tenant_users')
      .select('*')
      .limit(10)

    if (tenantUsersError) {
      console.error('Error fetching tenant_users:', tenantUsersError)
    } else {
      console.log(`Found ${tenantUsers?.length || 0} tenant_users relationships`)
      if (tenantUsers && tenantUsers.length > 0) {
        console.log('Sample tenant_user structure:')
        console.log(JSON.stringify(tenantUsers[0], null, 2))
        console.log('\nAll tenant_user relationships:')
        tenantUsers.forEach(tu => {
          console.log(`- User: ${tu.user_id}, Tenant: ${tu.tenant_id}, Role: ${tu.role}`)
        })
      }
    }

    // 4. Check custom_domains table
    console.log('\n4. CUSTOM_DOMAINS TABLE:')
    console.log('------------------------')
    const { data: customDomains, error: customDomainsError } = await supabaseAdmin
      .from('custom_domains')
      .select('*')
      .limit(10)

    if (customDomainsError) {
      console.error('Error fetching custom_domains:', customDomainsError)
    } else {
      console.log(`Found ${customDomains?.length || 0} custom domains`)
      if (customDomains && customDomains.length > 0) {
        console.log('Sample custom_domain structure:')
        console.log(JSON.stringify(customDomains[0], null, 2))
        console.log('\nAll custom domains:')
        customDomains.forEach(cd => {
          console.log(`- ${cd.domain} -> Tenant: ${cd.tenant_id}, Verified: ${cd.verified}`)
        })
      }
    }

    // 5. Check relationships with joins
    console.log('\n5. CHECKING RELATIONSHIPS:')
    console.log('---------------------------')
    
    // Check users with their tenant relationships
    console.log('\nUsers with their tenants:')
    const { data: usersWithTenants, error: joinError1 } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        tenant_users!inner (
          role,
          tenants!inner (
            id,
            name,
            slug
          )
        )
      `)
      .limit(10)

    if (joinError1) {
      console.error('Error fetching users with tenants:', joinError1)
    } else {
      console.log(`Found ${usersWithTenants?.length || 0} users with tenant relationships`)
      if (usersWithTenants && usersWithTenants.length > 0) {
        usersWithTenants.forEach(user => {
          console.log(`\nUser: ${user.email} (ID: ${user.id})`)
          console.log('  Tenants:', JSON.stringify(user.tenant_users, null, 2))
        })
      }
    }

    // Try alternative join approach
    console.log('\n6. ALTERNATIVE JOIN APPROACH:')
    console.log('------------------------------')
    const { data: altJoin, error: altJoinError } = await supabaseAdmin
      .from('tenant_users')
      .select(`
        user_id,
        role,
        users!inner (
          id,
          email
        ),
        tenants!inner (
          id,
          name,
          slug
        )
      `)
      .limit(10)

    if (altJoinError) {
      console.error('Error with alternative join:', altJoinError)
    } else {
      console.log(`Found ${altJoin?.length || 0} relationships`)
      if (altJoin && altJoin.length > 0) {
        altJoin.forEach(rel => {
          console.log(`\nUser: ${rel.users?.email} (${rel.user_id})`)
          console.log(`  Tenant: ${rel.tenants?.name} (${rel.tenants?.slug})`)
          console.log(`  Role: ${rel.role}`)
        })
      }
    }

    // 7. Check specific user (if you know the email)
    console.log('\n7. CHECKING SPECIFIC USER:')
    console.log('---------------------------')
    // Using the admin email from env
    const testEmail = process.env.INITIAL_ADMIN_EMAIL || 'levan@sarke.ge'
    
    const { data: specificUser, error: specificError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', testEmail)
      .single()

    if (specificError) {
      console.log(`No user found with email: ${testEmail}`)
    } else {
      console.log(`Found user: ${specificUser.email}`)
      console.log('User details:', JSON.stringify(specificUser, null, 2))
      
      // Check this user's tenant relationships
      const { data: userTenants, error: userTenantsError } = await supabaseAdmin
        .from('tenant_users')
        .select(`
          *,
          tenants (*)
        `)
        .eq('user_id', specificUser.id)

      if (userTenantsError) {
        console.error('Error fetching user tenants:', userTenantsError)
      } else {
        console.log(`User has ${userTenants?.length || 0} tenant relationships:`)
        console.log(JSON.stringify(userTenants, null, 2))
      }
    }

    // 8. Check auth.users table (Supabase Auth)
    console.log('\n8. AUTH.USERS TABLE (Supabase Auth):')
    console.log('-------------------------------------')
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()

    if (authError) {
      console.error('Error fetching auth users:', authError)
    } else {
      console.log(`Found ${authUsers.users?.length || 0} auth users`)
      if (authUsers.users && authUsers.users.length > 0) {
        console.log('\nAuth users:')
        authUsers.users.forEach(user => {
          console.log(`- ${user.email} (ID: ${user.id})`)
          console.log(`  Created: ${user.created_at}`)
          console.log(`  Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`)
        })
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

// Run the check
checkDatabase().then(() => {
  console.log('\n=== Database check complete ===')
  process.exit(0)
}).catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})