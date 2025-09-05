'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

interface TenantUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'member' | 'viewer'
  added_at: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<TenantUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Add user dialog state
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addUserForm, setAddUserForm] = useState({
    email: '',
    name: '',
    password: '',
    role: 'member',
    createNewUser: false
  })
  const [addingUser, setAddingUser] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/tenants/users')
      if (!response.ok) throw new Error('Failed to fetch users')
      
      const data = await response.json()
      setUsers(data.users || [])
    } catch (err) {
      setError('Failed to load users')
      // Error logged client-side only for debugging
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async () => {
    setAddingUser(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/tenants/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addUserForm)
      })

      const data = await response.json()

      if (!response.ok) {
        // Check if user doesn't exist
        if (response.status === 404) {
          // Ask to create new user
          if (confirm('User not found. Would you like to create a new user with this email?')) {
            setAddUserForm({ ...addUserForm, createNewUser: true })
            // Retry with createNewUser flag
            const retryResponse = await fetch('/api/tenants/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...addUserForm, createNewUser: true })
            })
            
            if (retryResponse.ok) {
              const retryData = await retryResponse.json()
              setSuccess('User created and added successfully')
              setShowAddDialog(false)
              setAddUserForm({ email: '', name: '', password: '', role: 'member', createNewUser: false })
              fetchUsers()
            } else {
              const retryError = await retryResponse.json()
              setError(retryError.error || 'Failed to create user')
            }
          }
        } else {
          setError(data.error || 'Failed to add user')
        }
        return
      }

      setSuccess('User added successfully')
      setShowAddDialog(false)
      setAddUserForm({ email: '', name: '', password: '', role: 'member', createNewUser: false })
      fetchUsers()
    } catch (err) {
      setError('Network error')
    } finally {
      setAddingUser(false)
    }
  }

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/tenants/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Failed to update role')
        return
      }

      setSuccess('Role updated successfully')
      fetchUsers()
    } catch (err) {
      setError('Failed to update role')
    }
  }

  const handleRemoveUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to remove ${email} from this organization?`)) {
      return
    }

    try {
      const response = await fetch(`/api/tenants/users/${userId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Failed to remove user')
        return
      }

      setSuccess('User removed successfully')
      fetchUsers()
    } catch (err) {
      setError('Failed to remove user')
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-300'
      case 'member': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'viewer': return 'bg-gray-100 text-gray-800 border-gray-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Team Members</h1>
        <p className="text-muted-foreground">Manage users in your organization</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>
                {users.length} {users.length === 1 ? 'user' : 'users'} in your organization
              </CardDescription>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>Add User</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add User to Organization</DialogTitle>
                  <DialogDescription>
                    Add an existing user or create a new one
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={addUserForm.email}
                      onChange={(e) => setAddUserForm({ ...addUserForm, email: e.target.value })}
                      placeholder="user@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">Name (optional)</Label>
                    <Input
                      id="name"
                      value={addUserForm.name}
                      onChange={(e) => setAddUserForm({ ...addUserForm, name: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  {addUserForm.createNewUser && (
                    <div>
                      <Label htmlFor="password">Password (for new user)</Label>
                      <Input
                        id="password"
                        type="password"
                        value={addUserForm.password}
                        onChange={(e) => setAddUserForm({ ...addUserForm, password: e.target.value })}
                        placeholder="••••••••"
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={addUserForm.role}
                      onValueChange={(value) => setAddUserForm({ ...addUserForm, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddDialog(false)}
                    disabled={addingUser}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddUser}
                    disabled={!addUserForm.email || addingUser}
                  >
                    {addingUser ? 'Adding...' : 'Add User'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No users in your organization yet</p>
              <Button onClick={() => setShowAddDialog(true)}>Add First User</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold">
                        {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{user.name || user.email}</p>
                        <Badge
                          variant="outline"
                          className={getRoleBadgeColor(user.role)}
                        >
                          {user.role}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={user.role}
                      onValueChange={(value) => handleUpdateRole(user.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveUser(user.id, user.email)}
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className={getRoleBadgeColor('admin')}>Admin</Badge>
              <p className="text-sm text-muted-foreground">Full access to all features, can manage users and settings</p>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className={getRoleBadgeColor('member')}>Member</Badge>
              <p className="text-sm text-muted-foreground">Can access and use all features, but cannot manage users</p>
            </div>
            <div className="flex items-start gap-3">
              <Badge variant="outline" className={getRoleBadgeColor('viewer')}>Viewer</Badge>
              <p className="text-sm text-muted-foreground">Read-only access to view content and reports</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}