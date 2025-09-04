export interface Tenant {
  id: string
  name: string
  slug: string
  email: string
  custom_domains: string[]
  subscription_plan: string
  settings: Record<string, any>
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  tenant_id: string
  email: string
  password_hash: string
  name?: string
  role: 'owner' | 'admin' | 'member'
  permissions: string[]
  created_at: string
  updated_at: string
}

export interface AppAccess {
  id: string
  tenant_id: string
  app_name: 'page_builder' | 'email' | 'webinar' | 'lms'
  enabled: boolean
  settings: Record<string, any>
  created_at: string
}

export interface Session {
  id: string
  user_id: string
  tenant_id: string
  refresh_token: string
  expires_at: string
  created_at: string
}