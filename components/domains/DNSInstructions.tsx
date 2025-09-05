'use client'

interface DNSRecord {
  type: string
  name: string
  value: string
  ttl?: number
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

  return (
    <div className="space-y-6">
      {/* DNS Records Table */}
      <div>
        <h3 className="text-lg font-semibold mb-3">DNS Records to Add</h3>
        <div className="bg-gray-50 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Type</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Name</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Value</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">TTL</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {dnsRecords.map((record, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded">
                      {record.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">{record.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded break-all">
                        {record.value}
                      </code>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {record.ttl || 'Auto'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => copyToClipboard(record.value)}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      Copy
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Step by Step Instructions */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Setup Instructions for {instructions.name}</h3>
        <ol className="space-y-2">
          {instructions.steps.map((step, index) => (
            <li key={index} className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">
                {index + 1}
              </span>
              <span className="text-sm text-gray-700">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Provider Links */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-semibold text-sm mb-2">Quick Links to DNS Providers</h4>
        <div className="flex flex-wrap gap-3">
          <a href="https://dcc.godaddy.com" target="_blank" rel="noopener noreferrer" 
            className="text-blue-600 hover:underline text-sm">
            GoDaddy DNS →
          </a>
          <a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-sm">
            Cloudflare →
          </a>
          <a href="https://ap.www.namecheap.com" target="_blank" rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-sm">
            Namecheap →
          </a>
          <a href="https://cp.dnsmadeeasy.com" target="_blank" rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-sm">
            DNS Made Easy →
          </a>
        </div>
      </div>

      {/* Important Notes */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-semibold text-sm mb-2 text-yellow-800">Important Notes</h4>
        <ul className="space-y-1 text-sm text-yellow-700">
          <li>• DNS changes typically take 5-30 minutes to propagate</li>
          <li>• If using Cloudflare, set proxy status to "DNS only" (gray cloud)</li>
          <li>• Keep existing records unless they conflict with these</li>
          <li>• For apex domains (example.com), use A record pointing to 76.76.21.21</li>
          <li>• For subdomains (www.example.com), use CNAME pointing to cname.vercel-dns.com</li>
        </ul>
      </div>
    </div>
  )
}