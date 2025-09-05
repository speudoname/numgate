import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { supabaseAdmin } from '@/lib/supabase/server' // Still need for POST (user creation)
import { verifyToken } from '@/lib/auth/jwt'
import { hashPassword } from '@/lib/auth/password'

// GET - List all users in the tenant
export async function GET(request: NextRequest) {
  try {
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

    // Get all users for this tenant - use anon client with RLS
    const supabase = createServerClient(request)
    
    const { data: tenantUsers, error } = await supabase
      .from('tenant_users')
      .select(`
        *,
        users (
          id,
          email,
          name,
          created_at
        )
      `)
      .eq('tenant_id', payload.tenant_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      users: tenantUsers.map(tu => ({
        id: tu.users.id,
        email: tu.users.email,
        name: tu.users.name,
        role: tu.role,
        created_at: tu.created_at,
        added_at: tu.created_at
      }))
    })
  } catch (error) {
    console.error('Error fetching tenant users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Add a user to the tenant
export async function POST(request: NextRequest) {
  try {
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

    const { email, name, role = 'member', createNewUser = false, password } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    let userId = null

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      userId = existingUser.id
      
      // Check if user is already in this tenant
      const { data: existingMembership } = await supabaseAdmin
        .from('tenant_users')
        .select('id')
        .eq('tenant_id', payload.tenant_id)
        .eq('user_id', userId)
        .single()

      if (existingMembership) {
        return NextResponse.json({ error: 'User is already a member of this organization' }, { status: 400 })
      }
    } else if (createNewUser) {
      // Create new user if flag is set
      if (!password) {
        return NextResponse.json({ error: 'Password is required for new users' }, { status: 400 })
      }

      const passwordHash = await hashPassword(password)
      
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          email,
          name: name || email.split('@')[0],
          password_hash: passwordHash,
          tenant_id: payload.tenant_id, // Set initial tenant for compatibility
          role: role,
          permissions: []
        })
        .select()
        .single()

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }

      userId = newUser.id
    } else {
      return NextResponse.json({ 
        error: 'User not found. Set createNewUser to true to create a new user.' 
      }, { status: 404 })
    }

    // Add user to tenant
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('tenant_users')
      .insert({
        tenant_id: payload.tenant_id,
        user_id: userId,
        role: role,
        created_by: payload.user_id
      })
      .select(`
        *,
        users (
          id,
          email,
          name
        )
      `)
      .single()

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: membership.users.id,
        email: membership.users.email,
        name: membership.users.name,
        role: membership.role,
        added_at: membership.created_at
      }
    })
  } catch (error) {
    console.error('Error adding user to tenant:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}