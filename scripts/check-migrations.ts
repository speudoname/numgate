import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key for admin access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hbopxprpgvrkucztsvnq.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhib3B4cHJwZ3Zya3VjenRzdm5xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzAxODUzOSwiZXhwIjoyMDcyNTk0NTM5fQ.dZRhMWMIZdHOzgQ5CMVW1jxNew4tT2dvUnQbjSi9uc4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkMigrations() {
  console.log('Checking Supabase migrations status...\n');
  
  // Check Migration 001: ssl_status column in custom_domains table
  console.log('=== Migration 001: ssl_status column ===');
  try {
    const { data: customDomains, error } = await supabase
      .from('custom_domains')
      .select('ssl_status')
      .limit(1);
    
    if (error) {
      if (error.message.includes('column') && error.message.includes('ssl_status')) {
        console.log('❌ ssl_status column NOT FOUND - Migration 001 not applied');
      } else if (error.message.includes('relation') && error.message.includes('custom_domains')) {
        console.log('❌ custom_domains table NOT FOUND - Migration 001 not applied');
      } else {
        console.log('⚠️  Error checking ssl_status:', error.message);
      }
    } else {
      console.log('✅ ssl_status column EXISTS - Migration 001 applied');
    }
  } catch (e) {
    console.log('⚠️  Error checking Migration 001:', e);
  }
  
  // Check Migration 002: is_primary column in custom_domains table
  console.log('\n=== Migration 002: is_primary column ===');
  try {
    const { data: primaryCheck, error } = await supabase
      .from('custom_domains')
      .select('is_primary')
      .limit(1);
    
    if (error) {
      if (error.message.includes('column') && error.message.includes('is_primary')) {
        console.log('❌ is_primary column NOT FOUND - Migration 002 not applied');
      } else if (error.message.includes('relation') && error.message.includes('custom_domains')) {
        console.log('❌ custom_domains table NOT FOUND - Migration 002 not applied');
      } else {
        console.log('⚠️  Error checking is_primary:', error.message);
      }
    } else {
      console.log('✅ is_primary column EXISTS - Migration 002 applied');
    }
  } catch (e) {
    console.log('⚠️  Error checking Migration 002:', e);
  }
  
  // Check Migration 003: tenant_users table
  console.log('\n=== Migration 003: tenant_users table ===');
  try {
    const { data: tenantUsers, error } = await supabase
      .from('tenant_users')
      .select('id, tenant_id, user_id, role')
      .limit(1);
    
    if (error) {
      if (error.message.includes('relation') && error.message.includes('tenant_users')) {
        console.log('❌ tenant_users table NOT FOUND - Migration 003 not applied');
      } else {
        console.log('⚠️  Error checking tenant_users:', error.message);
      }
    } else {
      console.log('✅ tenant_users table EXISTS - Migration 003 applied');
      
      // Check for the columns
      const { data: columnCheck, error: colError } = await supabase
        .from('tenant_users')
        .select('*')
        .limit(0);
      
      if (!colError) {
        console.log('   ✅ All required columns present (id, tenant_id, user_id, role)');
      }
    }
  } catch (e) {
    console.log('⚠️  Error checking Migration 003:', e);
  }
  
  // Check for schema_migrations table to see applied migrations
  console.log('\n=== Checking schema_migrations table ===');
  try {
    const { data: migrations, error } = await supabase
      .from('schema_migrations')
      .select('*')
      .order('version', { ascending: true });
    
    if (error) {
      if (error.message.includes('relation') && error.message.includes('schema_migrations')) {
        console.log('ℹ️  No schema_migrations table found (migrations may be applied manually)');
      } else {
        console.log('⚠️  Error checking schema_migrations:', error.message);
      }
    } else {
      console.log('Applied migrations from schema_migrations table:');
      if (migrations && migrations.length > 0) {
        migrations.forEach(m => {
          console.log(`  - ${m.version}: ${m.name || 'unnamed'}`);
        });
      } else {
        console.log('  (no entries found)');
      }
    }
  } catch (e) {
    console.log('⚠️  Error checking schema_migrations:', e);
  }
  
  // Summary
  console.log('\n=== SUMMARY ===');
  console.log('Run the following command to apply missing migrations:');
  console.log('npx supabase db push --db-url "postgresql://postgres.[project-ref]:[password]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"');
  console.log('\nOr apply them manually through the Supabase dashboard SQL editor.');
}

checkMigrations().then(() => {
  console.log('\nMigration check complete.');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});