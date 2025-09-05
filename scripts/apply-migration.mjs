#!/usr/bin/env node
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  try {
    console.log('=== Applying migration: 002_add_primary_domain_flag.sql ===\n');
    
    // Since Supabase doesn't allow direct DDL via the client library,
    // we need to check if the migration has already been applied
    
    // First, check if the column already exists
    const { data: existingDomains, error: checkError } = await supabase
      .from('custom_domains')
      .select('*')
      .limit(1);
    
    if (checkError) {
      console.log('custom_domains table might not exist yet:', checkError.message);
    } else if (existingDomains && existingDomains.length > 0) {
      console.log('Sample existing data:', existingDomains[0]);
      
      // Check if is_primary column exists
      if ('is_primary' in existingDomains[0]) {
        console.log('\n✓ Migration appears to be already applied (is_primary column exists)');
        
        // Check how many primary domains exist
        const { data: primaryDomains, error: primaryError } = await supabase
          .from('custom_domains')
          .select('id, domain, tenant_id, is_primary')
          .eq('is_primary', true);
        
        if (!primaryError && primaryDomains) {
          console.log(`\nFound ${primaryDomains.length} primary domains:`);
          primaryDomains.forEach(d => {
            console.log(`  - ${d.domain} (tenant: ${d.tenant_id})`);
          });
        }
        
        // Check all domains
        const { data: allDomains, error: allError } = await supabase
          .from('custom_domains')
          .select('id, domain, tenant_id, is_primary, created_at')
          .order('created_at', { ascending: false });
        
        if (!allError && allDomains) {
          console.log(`\nAll domains (${allDomains.length} total):`);
          allDomains.forEach(d => {
            console.log(`  - ${d.domain} (tenant: ${d.tenant_id}, primary: ${d.is_primary})`);
          });
        }
        
        return;
      }
    }
    
    console.log('\n⚠️  Migration has not been applied yet.');
    console.log('\nTo apply this migration, please use one of these methods:\n');
    console.log('1. Supabase Dashboard:');
    console.log('   - Go to: https://supabase.com/dashboard/project/hbopxprpgvrkucztsvnq/sql');
    console.log('   - Copy and paste the migration SQL from:');
    console.log('   ', join(__dirname, '..', 'supabase', 'migrations', '002_add_primary_domain_flag.sql'));
    console.log('   - Click "Run" to execute\n');
    
    console.log('2. Using Supabase CLI with direct connection:');
    console.log('   - Get your database password from the Supabase Dashboard');
    console.log('   - Settings > Database > Connection string');
    console.log('   - Run: npx supabase db push --db-url "YOUR_CONNECTION_STRING"\n');
    
    // Read and display the migration for reference
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '002_add_primary_domain_flag.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    console.log('Migration SQL to apply:');
    console.log('=' .repeat(50));
    console.log(migrationSQL);
    console.log('=' .repeat(50));
    
  } catch (error) {
    console.error('\nError:', error);
    process.exit(1);
  }
}

// Also check if we can set primary domains for existing entries
async function setInitialPrimaryDomains() {
  try {
    console.log('\n=== Setting initial primary domains ===\n');
    
    // Get all domains grouped by tenant
    const { data: domains, error } = await supabase
      .from('custom_domains')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching domains:', error);
      return;
    }
    
    if (!domains || domains.length === 0) {
      console.log('No domains found in the database');
      return;
    }
    
    // Group by tenant_id
    const tenantDomains = {};
    domains.forEach(d => {
      if (!tenantDomains[d.tenant_id]) {
        tenantDomains[d.tenant_id] = [];
      }
      tenantDomains[d.tenant_id].push(d);
    });
    
    console.log(`Found ${Object.keys(tenantDomains).length} tenants with domains`);
    
    // If is_primary column exists, update the first domain for each tenant
    if (domains[0] && 'is_primary' in domains[0]) {
      for (const [tenantId, tenantDomainList] of Object.entries(tenantDomains)) {
        const hasPrimary = tenantDomainList.some(d => d.is_primary === true);
        
        if (!hasPrimary && tenantDomainList.length > 0) {
          // Set the first (oldest) domain as primary
          const primaryDomain = tenantDomainList[0];
          
          const { error: updateError } = await supabase
            .from('custom_domains')
            .update({ is_primary: true })
            .eq('id', primaryDomain.id);
          
          if (updateError) {
            console.error(`Failed to set primary for ${primaryDomain.domain}:`, updateError);
          } else {
            console.log(`✓ Set ${primaryDomain.domain} as primary for tenant ${tenantId}`);
          }
        } else if (hasPrimary) {
          const primary = tenantDomainList.find(d => d.is_primary);
          console.log(`  Tenant ${tenantId} already has primary: ${primary.domain}`);
        }
      }
    }
  } catch (error) {
    console.error('Error setting primary domains:', error);
  }
}

runMigration().then(() => setInitialPrimaryDomains());