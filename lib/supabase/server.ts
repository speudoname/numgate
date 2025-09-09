import { SupabaseClientFactory, initializeSupabase } from './shared-client-factory'

// Initialize the shared Supabase client factory
initializeSupabase()

// Export pre-configured clients for backward compatibility
export const supabaseAdmin = SupabaseClientFactory.createAdminClient()

// Export the factory for advanced use cases
export { SupabaseClientFactory }