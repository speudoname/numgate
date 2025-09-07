'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Server, Mail, Settings, Check, AlertCircle } from 'lucide-react'

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

export default function PostmarkConfigPage() {
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

  useEffect(() => {
    fetchServersAndConfig()
  }, [])

  const fetchServersAndConfig = async () => {
    try {
      setLoading(true)
      
      // Fetch all servers from Postmark
      const serversResponse = await fetch('/api/super-admin/postmark/servers')
      
      if (serversResponse.ok) {
        const data = await serversResponse.json()
        setServers(data.servers || [])
      }
      
      // Fetch current config
      const configResponse = await fetch('/api/super-admin/postmark/config')
      
      if (configResponse.ok) {
        const data = await configResponse.json()
        if (data.currentConfig) {
          setConfig(data.currentConfig)
        }
      }
    } catch (err) {
      console.error('Failed to fetch servers:', err)
      setError('Failed to load Postmark servers')
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

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/super-admin/postmark/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
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
        setSuccess('Shared server configuration saved successfully!')
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
                <div>
                  <Label>Server Token</Label>
                  <Input
                    type="password"
                    value={config.transactional_server_token}
                    onChange={(e) => setConfig({ ...config, transactional_server_token: e.target.value })}
                    placeholder="Server API token"
                  />
                </div>
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
                <div>
                  <Label>Server Token</Label>
                  <Input
                    type="password"
                    value={config.marketing_server_token}
                    onChange={(e) => setConfig({ ...config, marketing_server_token: e.target.value })}
                    placeholder="Server API token"
                  />
                </div>
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