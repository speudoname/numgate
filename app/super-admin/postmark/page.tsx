'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Server, Mail, Settings, Check, AlertCircle, Eye, EyeOff, MousePointer, Plus, Sparkles } from 'lucide-react'

interface PostmarkServer {
  ID: number
  Name: string
  ApiTokens?: string[]
  Color?: string
  TrackOpens?: boolean
  TrackLinks?: string
}

interface MessageStream {
  ID: string
  ServerID: number
  Name: string
  MessageStreamType: string
  Description?: string
}

interface SharedConfig {
  transactional_server_token?: string
  transactional_server_id?: number
  transactional_stream_id?: string
  marketing_server_token?: string
  marketing_server_id?: number
  marketing_stream_id?: string
  default_from_email?: string
  default_from_name?: string
  default_reply_to?: string
}

interface Tenant {
  id: string
  name: string
  slug: string
  postmark_id?: string | null
}

export default function PostmarkConfigPage() {
  const [selectedTenantId, setSelectedTenantId] = useState<string>('default')
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [servers, setServers] = useState<PostmarkServer[]>([])
  const [streams, setStreams] = useState<Record<number, MessageStream[]>>({})
  const [config, setConfig] = useState<SharedConfig>({
    transactional_stream_id: 'outbound',
    marketing_stream_id: 'broadcasts',
    default_from_email: 'share@share.komunate.com',
    default_from_name: 'Komunate Platform',
    default_reply_to: 'noreply@komunate.com'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fetchingStreams, setFetchingStreams] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [updatingTracking, setUpdatingTracking] = useState<number | null>(null)
  const [creatingServers, setCreatingServers] = useState(false)
  const [currentTenantPostmarkId, setCurrentTenantPostmarkId] = useState<string | null>(null)

  useEffect(() => {
    fetchTenants()
    fetchServersAndConfig()
  }, [])

  useEffect(() => {
    // Refetch config when tenant selection changes
    if (selectedTenantId) {
      fetchServersAndConfig()
      // Update current tenant's postmark_id
      const tenant = tenants.find(t => t.id === selectedTenantId)
      setCurrentTenantPostmarkId(tenant?.postmark_id || null)
    } else {
      setCurrentTenantPostmarkId(null)
    }
  }, [selectedTenantId, tenants])

  const fetchTenants = async () => {
    try {
      const response = await fetch('/api/super-admin/tenants')
      if (response.ok) {
        const data = await response.json()
        setTenants(data.tenants || [])
      }
    } catch (err) {
      console.error('Failed to fetch tenants:', err)
    }
  }

  const fetchServersAndConfig = async () => {
    try {
      setLoading(true)
      
      // First, fetch current saved config from database (with tenant ID if selected)
      const configUrl = selectedTenantId === 'default' 
        ? '/api/super-admin/postmark/config'
        : `/api/super-admin/postmark/config?tenantId=${selectedTenantId}`
      
      const configResponse = await fetch(configUrl)
      
      if (configResponse.ok) {
        const data = await configResponse.json()
        if (data.currentConfig) {
          setConfig(data.currentConfig)
          
          // If we have saved servers, fetch their streams
          if (data.currentConfig.transactional_server_id && data.currentConfig.transactional_server_token) {
            await fetchStreamsForServer(
              data.currentConfig.transactional_server_id, 
              data.currentConfig.transactional_server_token
            )
          }
          if (data.currentConfig.marketing_server_id && data.currentConfig.marketing_server_token) {
            await fetchStreamsForServer(
              data.currentConfig.marketing_server_id, 
              data.currentConfig.marketing_server_token
            )
          }
        }
      }
      
      // Then fetch all available servers from Postmark
      const serversResponse = await fetch('/api/super-admin/postmark/servers')
      
      if (serversResponse.ok) {
        const data = await serversResponse.json()
        setServers(data.servers || [])
      }
    } catch (err) {
      console.error('Failed to fetch config:', err)
      setError('Failed to load configuration')
    } finally {
      setLoading(false)
    }
  }

  const fetchStreamsForServer = async (serverId: number, serverToken: string) => {
    if (!serverToken) {
      setError('Server token required to fetch streams')
      return
    }

    try {
      setFetchingStreams(serverId)
      
      const response = await fetch(`/api/super-admin/postmark/streams?serverId=${serverId}&token=${serverToken}`)
      
      if (response.ok) {
        const data = await response.json()
        setStreams(prev => ({
          ...prev,
          [serverId]: data.streams || []
        }))
      }
    } catch (err) {
      console.error('Failed to fetch streams:', err)
      setError('Failed to fetch message streams')
    } finally {
      setFetchingStreams(null)
    }
  }

  const handleServerChange = async (type: 'transactional' | 'marketing', serverId: string) => {
    const server = servers.find(s => s.ID === parseInt(serverId))
    if (!server) return

    // Get or prompt for server token
    let token = ''
    if (server.ApiTokens && server.ApiTokens.length > 0) {
      token = server.ApiTokens[0]
    } else {
      token = prompt(`Enter API token for server "${server.Name}":`) || ''
      if (!token) return
    }

    // Update config
    if (type === 'transactional') {
      setConfig(prev => ({
        ...prev,
        transactional_server_id: server.ID,
        transactional_server_token: token
      }))
    } else {
      setConfig(prev => ({
        ...prev,
        marketing_server_id: server.ID,
        marketing_server_token: token
      }))
    }

    // Fetch streams for this server
    await fetchStreamsForServer(server.ID, token)
  }

  const toggleTracking = async (serverId: number, serverToken: string, trackingType: 'opens' | 'clicks', currentValue: boolean) => {
    setUpdatingTracking(serverId)
    setError('')
    
    try {
      const response = await fetch('/api/super-admin/postmark/tracking', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          serverId,
          serverToken,
          trackingType,
          enabled: !currentValue
        })
      })

      if (response.ok) {
        // Refresh servers to get updated tracking status
        const serversResponse = await fetch('/api/super-admin/postmark/servers')
        if (serversResponse.ok) {
          const data = await serversResponse.json()
          setServers(data.servers || [])
        }
        setSuccess(`${trackingType === 'opens' ? 'Open' : 'Click'} tracking ${!currentValue ? 'enabled' : 'disabled'}`)
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const data = await response.json()
        setError(data.error || `Failed to update ${trackingType} tracking`)
      }
    } catch (err: any) {
      console.error('Toggle tracking error:', err)
      setError(`Failed to update ${trackingType} tracking`)
    } finally {
      setUpdatingTracking(null)
    }
  }

  const handleCreateServers = async () => {
    if (!currentTenantPostmarkId) {
      setError('No Postmark ID found for this tenant')
      return
    }

    setCreatingServers(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/super-admin/postmark/create-servers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenantId: selectedTenantId,
          postmarkId: currentTenantPostmarkId
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSuccess(`Successfully created servers: ${data.transactionalServer.Name} and ${data.marketingServer.Name}`)
        // Refresh servers list
        await fetchServersAndConfig()
        setTimeout(() => setSuccess(''), 5000)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to create servers')
      }
    } catch (err: any) {
      console.error('Create servers error:', err)
      setError(err.message || 'Failed to create servers')
    } finally {
      setCreatingServers(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const configUrl = selectedTenantId === 'default' 
        ? '/api/super-admin/postmark/config'
        : `/api/super-admin/postmark/config?tenantId=${selectedTenantId}`
      
      const response = await fetch(configUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tenant_id: selectedTenantId === 'default' ? null : selectedTenantId,
          transactional_server_token: config.transactional_server_token,
          transactional_server_id: config.transactional_server_id,
          transactional_stream_id: config.transactional_stream_id,
          marketing_server_token: config.marketing_server_token,
          marketing_server_id: config.marketing_server_id,
          marketing_stream_id: config.marketing_stream_id,
          default_from_email: config.default_from_email,
          default_from_name: config.default_from_name,
          default_reply_to: config.default_reply_to
        })
      })

      if (response.ok) {
        const successMsg = selectedTenantId === 'default' 
          ? 'Default configuration saved successfully!'
          : `Configuration saved for ${tenants.find(t => t.id === selectedTenantId)?.name}!`
        setSuccess(successMsg)
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to save configuration')
      }
    } catch (err: any) {
      console.error('Save error:', err)
      setError(err.message || 'Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Postmark Email Configuration
          </CardTitle>
          <CardDescription>
            Configure the default shared email servers that all free-tier tenants will use
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tenant Selector */}
          <div className="border-2 border-gray-300 rounded-lg p-4 bg-blue-50">
            <Label>Configuration For:</Label>
            <Select
              value={selectedTenantId}
              onValueChange={setSelectedTenantId}
            >
              <SelectTrigger className="w-full mt-2">
                <SelectValue placeholder="Select configuration target..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">Default Configuration</span>
                    <span className="text-sm text-gray-500">(Shared by all free-tier tenants)</span>
                  </div>
                </SelectItem>
                <div className="my-2 border-t" />
                {tenants.map(tenant => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    <div className="flex items-center gap-2">
                      <span>{tenant.name}</span>
                      <span className="text-sm text-gray-500">({tenant.slug})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTenantId !== 'default' && (
              <>
                <p className="text-sm text-blue-700 mt-2">
                  ⚠️ This will override the default configuration for {tenants.find(t => t.id === selectedTenantId)?.name}
                </p>
                {currentTenantPostmarkId && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm font-medium">Postmark ID: {currentTenantPostmarkId}</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleCreateServers()}
                        disabled={creatingServers}
                      >
                        {creatingServers ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Servers for Tenant
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-yellow-700 mt-2">
                      Suggested server names: {currentTenantPostmarkId}-trans, {currentTenantPostmarkId}-market
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Notice */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Configure the default shared servers here. Premium tenants can activate their own dedicated servers through ContactGate.
            </AlertDescription>
          </Alert>

          {/* Transactional Server */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Server className="h-4 w-4" />
                Transactional Email Server
              </CardTitle>
              <CardDescription>
                For system emails, password resets, order confirmations (no tracking for better deliverability)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Server</Label>
                  <Select
                    value={config.transactional_server_id?.toString() || ''}
                    onValueChange={(value) => handleServerChange('transactional', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select server..." />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Show suggested servers first if they exist */}
                      {currentTenantPostmarkId && (() => {
                        const suggestedServers = servers.filter(s => 
                          s.Name.toLowerCase().includes(currentTenantPostmarkId.toLowerCase() + '-trans')
                        )
                        if (suggestedServers.length > 0) {
                          return (
                            <>
                              <div className="px-2 py-1.5 text-xs font-medium text-yellow-600">
                                Suggested for {currentTenantPostmarkId}
                              </div>
                              {suggestedServers.map(server => (
                                <SelectItem key={server.ID} value={server.ID.toString()}>
                                  ⭐ {server.Name} {server.TrackOpens === false && '(No tracking ✓)'}
                                </SelectItem>
                              ))}
                              <div className="my-1 border-t" />
                            </>
                          )
                        }
                        return null
                      })()}
                      {/* Show all other servers */}
                      <div className="px-2 py-1.5 text-xs font-medium text-gray-500">
                        All Servers
                      </div>
                      {servers.map(server => (
                        <SelectItem key={server.ID} value={server.ID.toString()}>
                          {server.Name} {server.TrackOpens === false && '(No tracking ✓)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Message Stream</Label>
                  <Select
                    value={config.transactional_stream_id || 'outbound'}
                    onValueChange={(value) => setConfig({ ...config, transactional_stream_id: value })}
                    disabled={!config.transactional_server_id || fetchingStreams === config.transactional_server_id}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outbound">outbound (default)</SelectItem>
                      {streams[config.transactional_server_id || 0]?.map(stream => (
                        <SelectItem key={stream.ID} value={stream.ID}>
                          {stream.Name} ({stream.MessageStreamType})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {config.transactional_server_token && (
                <>
                  <div>
                    <Label>Server Token</Label>
                    <Input
                      type="password"
                      value={config.transactional_server_token}
                      onChange={(e) => setConfig({ ...config, transactional_server_token: e.target.value })}
                      placeholder="Server API token"
                    />
                  </div>
                  
                  {/* Tracking Status for selected server */}
                  {config.transactional_server_id && (() => {
                    const server = servers.find(s => s.ID === config.transactional_server_id)
                    if (!server) return null
                    
                    return (
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <h4 className="font-medium mb-3">Tracking Settings</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {server.TrackOpens ? (
                                <Eye className="h-4 w-4 text-green-600" />
                              ) : (
                                <EyeOff className="h-4 w-4 text-gray-400" />
                              )}
                              <span className="text-sm">Open Tracking</span>
                            </div>
                            <Button
                              size="sm"
                              variant={server.TrackOpens ? "default" : "outline"}
                              onClick={() => toggleTracking(server.ID, config.transactional_server_token!, 'opens', !!server.TrackOpens)}
                              disabled={updatingTracking === server.ID}
                            >
                              {updatingTracking === server.ID ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                server.TrackOpens ? 'Enabled' : 'Disabled'
                              )}
                            </Button>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {server.TrackLinks ? (
                                <MousePointer className="h-4 w-4 text-green-600" />
                              ) : (
                                <MousePointer className="h-4 w-4 text-gray-400" />
                              )}
                              <span className="text-sm">Click Tracking</span>
                            </div>
                            <Button
                              size="sm"
                              variant={server.TrackLinks ? "default" : "outline"}
                              onClick={() => toggleTracking(server.ID, config.transactional_server_token!, 'clicks', !!server.TrackLinks)}
                              disabled={updatingTracking === server.ID}
                            >
                              {updatingTracking === server.ID ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                server.TrackLinks ? 'Enabled' : 'Disabled'
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </>
              )}
            </CardContent>
          </Card>

          {/* Marketing Server */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Marketing Email Server
              </CardTitle>
              <CardDescription>
                For campaigns, newsletters, promotional emails (tracking enabled for analytics)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Server</Label>
                  <Select
                    value={config.marketing_server_id?.toString() || ''}
                    onValueChange={(value) => handleServerChange('marketing', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select server..." />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Show suggested servers first if they exist */}
                      {currentTenantPostmarkId && (() => {
                        const suggestedServers = servers.filter(s => 
                          s.Name.toLowerCase().includes(currentTenantPostmarkId.toLowerCase() + '-market')
                        )
                        if (suggestedServers.length > 0) {
                          return (
                            <>
                              <div className="px-2 py-1.5 text-xs font-medium text-yellow-600">
                                Suggested for {currentTenantPostmarkId}
                              </div>
                              {suggestedServers.map(server => (
                                <SelectItem key={server.ID} value={server.ID.toString()}>
                                  ⭐ {server.Name} {server.TrackOpens && '(Tracking enabled ✓)'}
                                </SelectItem>
                              ))}
                              <div className="my-1 border-t" />
                            </>
                          )
                        }
                        return null
                      })()}
                      {/* Show all other servers */}
                      <div className="px-2 py-1.5 text-xs font-medium text-gray-500">
                        All Servers
                      </div>
                      {servers.map(server => (
                        <SelectItem key={server.ID} value={server.ID.toString()}>
                          {server.Name} {server.TrackOpens && '(Tracking enabled ✓)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Message Stream</Label>
                  <Select
                    value={config.marketing_stream_id || 'broadcasts'}
                    onValueChange={(value) => setConfig({ ...config, marketing_stream_id: value })}
                    disabled={!config.marketing_server_id || fetchingStreams === config.marketing_server_id}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="broadcasts">broadcasts (default)</SelectItem>
                      {streams[config.marketing_server_id || 0]?.map(stream => (
                        <SelectItem key={stream.ID} value={stream.ID}>
                          {stream.Name} ({stream.MessageStreamType})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {config.marketing_server_token && (
                <>
                  <div>
                    <Label>Server Token</Label>
                    <Input
                      type="password"
                      value={config.marketing_server_token}
                      onChange={(e) => setConfig({ ...config, marketing_server_token: e.target.value })}
                      placeholder="Server API token"
                    />
                  </div>
                  
                  {/* Tracking Status for selected server */}
                  {config.marketing_server_id && (() => {
                    const server = servers.find(s => s.ID === config.marketing_server_id)
                    if (!server) return null
                    
                    return (
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <h4 className="font-medium mb-3">Tracking Settings</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {server.TrackOpens ? (
                                <Eye className="h-4 w-4 text-green-600" />
                              ) : (
                                <EyeOff className="h-4 w-4 text-gray-400" />
                              )}
                              <span className="text-sm">Open Tracking</span>
                            </div>
                            <Button
                              size="sm"
                              variant={server.TrackOpens ? "default" : "outline"}
                              onClick={() => toggleTracking(server.ID, config.marketing_server_token!, 'opens', !!server.TrackOpens)}
                              disabled={updatingTracking === server.ID}
                            >
                              {updatingTracking === server.ID ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                server.TrackOpens ? 'Enabled' : 'Disabled'
                              )}
                            </Button>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {server.TrackLinks ? (
                                <MousePointer className="h-4 w-4 text-green-600" />
                              ) : (
                                <MousePointer className="h-4 w-4 text-gray-400" />
                              )}
                              <span className="text-sm">Click Tracking</span>
                            </div>
                            <Button
                              size="sm"
                              variant={server.TrackLinks ? "default" : "outline"}
                              onClick={() => toggleTracking(server.ID, config.marketing_server_token!, 'clicks', !!server.TrackLinks)}
                              disabled={updatingTracking === server.ID}
                            >
                              {updatingTracking === server.ID ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                server.TrackLinks ? 'Enabled' : 'Disabled'
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </>
              )}
            </CardContent>
          </Card>

          {/* Default Sender Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Default Sender Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>From Email</Label>
                <Input
                  type="email"
                  value={config.default_from_email}
                  onChange={(e) => setConfig({ ...config, default_from_email: e.target.value })}
                  placeholder="share@share.komunate.com"
                />
              </div>

              <div>
                <Label>From Name</Label>
                <Input
                  value={config.default_from_name}
                  onChange={(e) => setConfig({ ...config, default_from_name: e.target.value })}
                  placeholder="Komunate Platform"
                />
              </div>

              <div>
                <Label>Reply-To Email</Label>
                <Input
                  type="email"
                  value={config.default_reply_to}
                  onChange={(e) => setConfig({ ...config, default_reply_to: e.target.value })}
                  placeholder="noreply@komunate.com"
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <Button
              onClick={handleSave}
              disabled={saving || !config.transactional_server_id || !config.marketing_server_id}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Save Configuration
                </>
              )}
            </Button>
          </div>

          {/* Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert>
              <Check className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}