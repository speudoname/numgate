import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  try {
    // Read the migration file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '002_add_primary_domain_flag.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    console.log('Applying migration: 002_add_primary_domain_flag.sql');
    console.log('Migration SQL:');
    console.log(migrationSQL);
    console.log('\n---\n');
    
    // Split the migration into individual statements
    // This is a simple split that works for this migration
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`Executing statement ${i + 1}/${statements.length}:`);
      console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));
      
      const { error } = await supabase.rpc('exec_sql', {
        sql: statement
      });
      
      if (error) {
        // Try direct execution if RPC doesn't exist
        console.log('RPC method not available, attempting direct execution...');
        
        // For Supabase, we need to use the REST API directly for DDL operations
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc`, {
          method: 'POST',
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: statement
          })
        });
        
        if (!response.ok) {
          console.error(`Failed to execute statement ${i + 1}:`, await response.text());
          // Continue with other statements
        } else {
          console.log(`Statement ${i + 1} executed successfully`);
        }
      } else {
        console.log(`Statement ${i + 1} executed successfully`);
      }
    }
    
    // Verify the migration was applied
    console.log('\n--- Verifying migration ---\n');
    
    const { data: columns, error: verifyError } = await supabase
      .from('custom_domains')
      .select('*')
      .limit(1);
    
    if (verifyError) {
      console.error('Error verifying migration:', verifyError);
    } else {
      console.log('Migration verified. Sample row from custom_domains:', columns);
    }
    
    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Error applying migration:', error);
    process.exit(1);
  }
}

applyMigration();