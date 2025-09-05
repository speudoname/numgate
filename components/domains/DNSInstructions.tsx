'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface DNSRecord {
  type: string
  name: string
  value: string
  ttl?: number
  purpose?: 'verification' | 'routing'
}

interface DNSInstructionsProps {
  domain: string
  dnsRecords?: DNSRecord[]
  provider?: string
}

export default function DNSInstructions({ domain, dnsRecords, provider }: DNSInstructionsProps) {
  if (!dnsRecords || dnsRecords.length === 0) {
    return null
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  // Separate verification and routing records
  const verificationRecords = dnsRecords.filter(r => r.purpose === 'verification')
  const routingRecords = dnsRecords.filter(r => r.purpose === 'routing')

  const getProviderInstructions = () => {
    const providers = {
      generic: {
        name: 'Your DNS Provider',
        steps: [
          'Log in to your domain registrar or DNS provider',
          'Navigate to DNS settings or DNS management',
          'Add the records shown below',
          'Save changes and wait 5-30 minutes for DNS propagation'
        ]
      },
      godaddy: {
        name: 'GoDaddy',
        steps: [
          'Log in to GoDaddy and go to "My Products"',
          'Click "DNS" next to your domain',
          'Click "Add" to create new records',
          'Add each record below with the correct Type, Name, and Value',
          'Save all changes'
        ]
      },
      cloudflare: {
        name: 'Cloudflare',
        steps: [
          'Log in to Cloudflare Dashboard',
          'Select your domain',
          'Go to "DNS" tab',
          'Click "Add record"',
          'Add each record below (set Proxy status to "DNS only")',
          'Changes take effect immediately'
        ]
      },
      namecheap: {
        name: 'Namecheap',
        steps: [
          'Log in to Namecheap',
          'Go to "Domain List" and click "Manage"',
          'Go to "Advanced DNS" tab',
          'Click "Add New Record"',
          'Add each record below',
          'Save all changes'
        ]
      }
    }

    return providers[provider as keyof typeof providers] || providers.generic
  }

  const instructions = getProviderInstructions()

  const RecordTable = ({ records, title }: { records: DNSRecord[], title: string }) => (
    <div className="space-y-2">
      <h4 className="font-semibold text-sm">{title}</h4>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>TTL</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record, index) => (
            <TableRow key={index}>
              <TableCell>
                <Badge variant="outline">{record.type}</Badge>
              </TableCell>
              <TableCell className="font-mono text-sm">{record.name}</TableCell>
              <TableCell>
                <code className="text-xs bg-secondary px-2 py-1 rounded break-all">
                  {record.value}
                </code>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {record.ttl || 'Auto'}
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(record.value)}
                >
                  Copy
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Priority Alert for Verification */}
      {verificationRecords.length > 0 && (
        <Alert>
          <AlertDescription className="font-medium">
            ⚠️ <strong>Step 1: Verification Required</strong> - Add the verification records first to prove domain ownership
          </AlertDescription>
        </Alert>
      )}

      {/* DNS Records Tabs */}
      <Tabs defaultValue={verificationRecords.length > 0 ? "verification" : "routing"}>
        <TabsList className="grid w-full grid-cols-2">
          {verificationRecords.length > 0 && (
            <TabsTrigger value="verification">
              Verification Records ({verificationRecords.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="routing">
            Routing Records ({routingRecords.length})
          </TabsTrigger>
        </TabsList>
        
        {verificationRecords.length > 0 && (
          <TabsContent value="verification" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Domain Verification</CardTitle>
                <CardDescription>
                  Add these records to verify domain ownership with Vercel
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecordTable records={verificationRecords} title="Required for Verification" />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="routing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Domain Routing</CardTitle>
              <CardDescription>
                Add these records to route traffic to your Vercel deployment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RecordTable records={routingRecords} title="Required for Routing" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Step by Step Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions for {instructions.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2">
            {instructions.steps.map((step, index) => (
              <li key={index} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </span>
                <span className="text-sm">{step}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Provider Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Links to DNS Providers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="https://dcc.godaddy.com" target="_blank" rel="noopener noreferrer">
                GoDaddy DNS →
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer">
                Cloudflare →
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="https://ap.www.namecheap.com" target="_blank" rel="noopener noreferrer">
                Namecheap →
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="https://cp.dnsmadeeasy.com" target="_blank" rel="noopener noreferrer">
                DNS Made Easy →
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Important Notes */}
      <Alert>
        <AlertDescription>
          <strong>Important Notes:</strong>
          <ul className="mt-2 space-y-1 text-sm list-disc list-inside">
            <li>DNS changes typically take 5-30 minutes to propagate</li>
            <li>If using Cloudflare, set proxy status to "DNS only" (gray cloud)</li>
            <li>Keep existing records unless they conflict with these</li>
            <li>For apex domains (example.com), use A record pointing to 76.76.21.21</li>
            <li>For subdomains (www.example.com), use CNAME pointing to cname.vercel-dns.com</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  )
}