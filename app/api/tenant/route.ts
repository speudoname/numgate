import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'

export async function GET(request: NextRequest) {
  const { userId, orgId, orgSlug } = await auth()
  const user = await currentUser()
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Mock tenant data for now - will connect to Neon later
  const mockTenantData = {
    tenant: {
      id: orgId || userId,
      name: orgSlug || user?.firstName || 'Personal Workspace',
      slug: orgSlug || 'personal',
      email: user?.emailAddresses[0]?.emailAddress || '',
      subscription_plan: 'free',
      custom_domains: []
    },
    user: {
      id: userId,
      email: user?.emailAddresses[0]?.emailAddress || '',
      name: user?.firstName || 'User',
      role: 'admin',
      is_super_admin: false
    },
    apps: [
      { id: '1', app_name: 'page_builder', enabled: true },
      { id: '2', app_name: 'contacts', enabled: true },
      { id: '3', app_name: 'email', enabled: false },
      { id: '4', app_name: 'webinar', enabled: false },
      { id: '5', app_name: 'lms', enabled: false }
    ]
  }

  return NextResponse.json(mockTenantData)
}