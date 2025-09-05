import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndCreateKomunateTenant() {
  try {
    console.log('Checking if tenant with slug "komunate" exists...');
    
    // Check if tenant exists
    const { data: existingTenant, error: checkError } = await supabase
      .from('tenants')
      .select('*')
      .eq('slug', 'komunate')
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw checkError;
    }
    
    if (existingTenant) {
      console.log('Tenant "komunate" already exists:');
      console.log(JSON.stringify(existingTenant, null, 2));
      return existingTenant;
    }
    
    // Create new tenant
    console.log('Creating new tenant "komunate"...');
    
    const newTenant = {
      name: 'Komunate Platform',
      slug: 'komunate',
      email: 'platform@komunate.com',
      subscription_plan: 'enterprise',
      settings: {
        description: 'Main Komunate platform tenant serving content from blob storage',
        features: {
          blob_storage: true,
          custom_domains: true,
          multi_app_access: true
        }
      }
    };
    
    const { data: createdTenant, error: createError } = await supabase
      .from('tenants')
      .insert(newTenant)
      .select()
      .single();
    
    if (createError) {
      throw createError;
    }
    
    console.log('Successfully created tenant "komunate":');
    console.log(JSON.stringify(createdTenant, null, 2));
    
    // Also create app_access entries for all available apps
    const apps = ['page_builder', 'email', 'webinar', 'lms'];
    const appAccessEntries = apps.map(app => ({
      tenant_id: createdTenant.id,
      app_name: app,
      enabled: true, // Enterprise plan gets access to all apps
      settings: {}
    }));
    
    const { error: appAccessError } = await supabase
      .from('app_access')
      .insert(appAccessEntries);
    
    if (appAccessError) {
      console.error('Error creating app access entries:', appAccessError);
      // Not critical, continue
    } else {
      console.log(`Created app access for ${apps.length} apps`);
    }
    
    return createdTenant;
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the function
checkAndCreateKomunateTenant()
  .then(() => {
    console.log('Operation completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });