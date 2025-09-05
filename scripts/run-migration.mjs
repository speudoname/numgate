#!/usr/bin/env node
import { config } from 'dotenv';
import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: '.env.local' });

// Extract database connection from Supabase URL
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Extract project ref from URL
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectRef) {
  console.error('Invalid Supabase URL');
  process.exit(1);
}

// For Supabase, we need to use the direct connection with the password from the dashboard
// The pattern is: postgres://postgres:[YOUR-PASSWORD]@db.[project-ref].supabase.co:5432/postgres
// We'll need to use the service role key as the password isn't directly available
// Alternative: Use the connection pooler with session mode
const databaseUrl = `postgres://postgres.${projectRef}:${supabaseServiceKey}@aws-0-us-west-1.pooler.supabase.com:5432/postgres?sslmode=require`;

async function runMigration() {
  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully');

    // Read the migration file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '002_add_primary_domain_flag.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    console.log('\n=== Applying migration: 002_add_primary_domain_flag.sql ===\n');
    
    // Split the migration into individual statements
    const statements = migrationSQL
      .split(/;(?=\s*\n|$)/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.match(/^\s*--/));
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip if it's just a comment
      if (statement.match(/^(--|\s*$)/)) continue;
      
      console.log(`\nExecuting statement ${i + 1}/${statements.length}:`);
      console.log(statement.substring(0, 200) + (statement.length > 200 ? '...' : ''));
      
      try {
        const result = await client.query(statement);
        console.log(`✓ Statement ${i + 1} executed successfully`);
        if (result.rowCount > 0) {
          console.log(`  Affected rows: ${result.rowCount}`);
        }
      } catch (error) {
        console.error(`✗ Statement ${i + 1} failed:`, error.message);
        // For "IF NOT EXISTS" statements, errors might be expected
        if (error.message.includes('already exists')) {
          console.log('  (This is expected if the migration was partially applied before)');
        } else {
          throw error;
        }
      }
    }
    
    // Verify the migration was applied
    console.log('\n=== Verifying migration ===\n');
    
    // Check if the column exists
    const columnCheck = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'custom_domains'
      AND column_name = 'is_primary';
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('✓ Column "is_primary" exists:', columnCheck.rows[0]);
    } else {
      console.log('✗ Column "is_primary" not found');
    }
    
    // Check if the index exists
    const indexCheck = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'custom_domains'
      AND indexname = 'idx_one_primary_per_tenant';
    `);
    
    if (indexCheck.rows.length > 0) {
      console.log('✓ Index "idx_one_primary_per_tenant" exists');
    } else {
      console.log('✗ Index "idx_one_primary_per_tenant" not found');
    }
    
    // Check sample data
    const sampleData = await client.query(`
      SELECT id, domain, tenant_id, is_primary, created_at
      FROM custom_domains
      ORDER BY created_at DESC
      LIMIT 5;
    `);
    
    console.log(`\nSample data (${sampleData.rows.length} rows):`);
    sampleData.rows.forEach(row => {
      console.log(`  - ${row.domain} (tenant: ${row.tenant_id}, primary: ${row.is_primary})`);
    });
    
    console.log('\n=== Migration completed successfully! ===\n');
  } catch (error) {
    console.error('\nError applying migration:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();