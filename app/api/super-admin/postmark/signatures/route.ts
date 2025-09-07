import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Check super-admin authorization
    const isSuperAdmin = request.headers.get('x-is-super-admin') === 'true'
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Super admin only' },
        { status: 401 }
      )
    }

    const accountToken = process.env.POSTMARK_ACCOUNT_TOKEN
    if (!accountToken) {
      return NextResponse.json(
        { error: 'POSTMARK_ACCOUNT_TOKEN not configured' },
        { status: 500 }
      )
    }

    // Fetch all signatures from Postmark (both domains and senders)
    // First fetch domains
    const domainsResponse = await fetch('https://api.postmarkapp.com/domains?offset=0&count=100', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Postmark-Account-Token': accountToken
      }
    })

    if (!domainsResponse.ok) {
      const error = await domainsResponse.text()
      return NextResponse.json(
        { error: `Failed to fetch domains: ${error}` },
        { status: domainsResponse.status }
      )
    }

    const domainsData = await domainsResponse.json()
    
    // Then fetch sender signatures (email-based)
    const sendersResponse = await fetch('https://api.postmarkapp.com/senders?offset=0&count=100', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Postmark-Account-Token': accountToken
      }
    })

    if (!sendersResponse.ok) {
      const error = await sendersResponse.text()
      return NextResponse.json(
        { error: `Failed to fetch senders: ${error}` },
        { status: sendersResponse.status }
      )
    }

    const sendersData = await sendersResponse.json()
    
    // Format the response with both domains and senders
    const signatures = {
      domains: (domainsData.Domains || []).map((domain: any) => ({
        ID: domain.ID,
        Name: domain.Name,
        Type: 'Domain',
        SPFVerified: domain.SPFVerified,
        DKIMVerified: domain.DKIMVerified,
        WeakDKIM: domain.WeakDKIM,
        ReturnPathDomainVerified: domain.ReturnPathDomainVerified,
        Confirmed: domain.SPFVerified && domain.DKIMVerified,
        DKIMPendingHost: domain.DKIMPendingHost,
        DKIMPendingTextValue: domain.DKIMPendingTextValue,
        DKIMUpdateStatus: domain.DKIMUpdateStatus,
        ReturnPathDomain: domain.ReturnPathDomain,
        ReturnPathDomainCNAMEValue: domain.ReturnPathDomainCNAMEValue
      })),
      senders: (sendersData.SenderSignatures || []).map((sender: any) => ({
        ID: sender.ID,
        Name: sender.Name,
        EmailAddress: sender.EmailAddress,
        Type: 'Sender',
        Domain: sender.Domain,
        ReplyToEmailAddress: sender.ReplyToEmailAddress,
        Confirmed: sender.Confirmed,
        SPFVerified: sender.SPFVerified,
        DKIMVerified: sender.DKIMVerified,
        ConfirmationPersonalNote: sender.ConfirmationPersonalNote
      }))
    }

    return NextResponse.json({ signatures })
    
  } catch (error) {
    console.error('Signatures fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST endpoint to create a new signature
export async function POST(request: NextRequest) {
  try {
    // Check super-admin authorization
    const isSuperAdmin = request.headers.get('x-is-super-admin') === 'true'
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Super admin only' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { type, name, fromEmail, replyToEmail } = body

    const accountToken = process.env.POSTMARK_ACCOUNT_TOKEN
    if (!accountToken) {
      return NextResponse.json(
        { error: 'POSTMARK_ACCOUNT_TOKEN not configured' },
        { status: 500 }
      )
    }

    let response, data

    if (type === 'domain') {
      // Create domain signature
      response = await fetch('https://api.postmarkapp.com/domains', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Postmark-Account-Token': accountToken
        },
        body: JSON.stringify({
          Name: name,
          ReturnPathDomain: `pm-bounces.${name}`
        })
      })

      if (!response.ok) {
        const error = await response.text()
        return NextResponse.json(
          { error: `Failed to create domain: ${error}` },
          { status: response.status }
        )
      }

      data = await response.json()

      // Return DNS records for configuration
      return NextResponse.json({
        success: true,
        type: 'domain',
        signature: {
          ID: data.ID,
          Name: data.Name,
          SPFVerified: data.SPFVerified,
          DKIMVerified: data.DKIMVerified
        },
        dnsRecords: {
          spf: {
            type: 'TXT',
            host: data.Name,
            value: 'v=spf1 a mx include:spf.mtasv.net ~all'
          },
          dkim: {
            type: 'TXT',
            host: data.DKIMPendingHost,
            value: data.DKIMPendingTextValue
          },
          returnPath: {
            type: 'CNAME',
            host: data.ReturnPathDomain,
            value: data.ReturnPathDomainCNAMEValue
          }
        }
      })

    } else if (type === 'sender') {
      // Create sender signature (email-based)
      response = await fetch('https://api.postmarkapp.com/senders', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Postmark-Account-Token': accountToken
        },
        body: JSON.stringify({
          FromEmail: fromEmail,
          Name: name,
          ReplyToEmail: replyToEmail || fromEmail
        })
      })

      if (!response.ok) {
        const error = await response.text()
        return NextResponse.json(
          { error: `Failed to create sender: ${error}` },
          { status: response.status }
        )
      }

      data = await response.json()

      return NextResponse.json({
        success: true,
        type: 'sender',
        signature: {
          ID: data.ID,
          Name: data.Name,
          EmailAddress: data.EmailAddress,
          Confirmed: data.Confirmed
        },
        confirmationNeeded: !data.Confirmed,
        message: !data.Confirmed ? 
          `A confirmation email has been sent to ${fromEmail}. Please check your inbox and click the confirmation link.` :
          'Sender signature created and confirmed successfully.'
      })
    }

    return NextResponse.json(
      { error: 'Invalid signature type. Must be "domain" or "sender"' },
      { status: 400 }
    )
    
  } catch (error) {
    console.error('Signature creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}