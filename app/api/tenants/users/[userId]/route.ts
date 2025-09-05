import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { verifyToken } from '@/lib/auth/jwt'

// PATCH - Update user role
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    // Await params as it's now a Promise in Next.js 15
    const params = await context.params
    
    // Get auth token
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify token and get user info
    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check if user is admin
    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { role } = await request.json()
    
    if (!role || !['admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Prevent self-demotion
    if (params.userId === payload.user_id && role !== 'admin') {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
    }

    // Update user role in tenant - use anon client with RLS
    const supabase = createServerClient(request)
    
    const { data, error } = await supabase
      .from('tenant_users')
      .update({ 
        role,
        updated_at: new Date().toISOString()
      })
      .eq('tenant_id', payload.tenant_id)
      .eq('user_id', params.userId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'User not found in this organization' }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'User role updated successfully'
    })
  } catch (error) {
    // Error logged server-side only
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove user from tenant
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    // Await params as it's now a Promise in Next.js 15
    const params = await context.params
    
    // Get auth token
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify token and get user info
    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check if user is admin
    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Prevent self-removal
    if (params.userId === payload.user_id) {
      return NextResponse.json({ error: 'Cannot remove yourself from the organization' }, { status: 400 })
    }
    
    // Create supabase client with RLS
    const supabase = createServerClient(request)

    // Check if this is the last admin
    const { data: admins } = await supabase
      .from('tenant_users')
      .select('id')
      .eq('tenant_id', payload.tenant_id)
      .eq('role', 'admin')

    if (admins && admins.length <= 1) {
      const { data: userToRemove } = await supabase
        .from('tenant_users')
        .select('role')
        .eq('tenant_id', payload.tenant_id)
        .eq('user_id', params.userId)
        .single()

      if (userToRemove?.role === 'admin') {
        return NextResponse.json({ 
          error: 'Cannot remove the last admin from the organization' 
        }, { status: 400 })
      }
    }

    // Remove user from tenant
    const { error } = await supabase
      .from('tenant_users')
      .delete()
      .eq('tenant_id', payload.tenant_id)
      .eq('user_id', params.userId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'User removed from organization successfully'
    })
  } catch (error) {
    // Error logged server-side only
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}