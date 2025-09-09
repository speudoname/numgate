import { NextRequest, NextResponse } from 'next/server'
import { SharedProxyHandler } from '@/lib/proxy/shared-proxy-handler'

// This file handles /contacts/* (sub paths)
// The parent route.ts handles /contacts (root path)

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params
  return handleProxyRequest(request, 'GET', params.path)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params
  return handleProxyRequest(request, 'POST', params.path)
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params
  return handleProxyRequest(request, 'PUT', params.path)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params
  return handleProxyRequest(request, 'DELETE', params.path)
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params
  return handleProxyRequest(request, 'PATCH', params.path)
}

async function handleProxyRequest(
  request: NextRequest,
  method: string,
  pathSegments: string[]
) {
  // Get the target URL from environment or default
  const targetUrl = process.env.CONTACTGATE_URL || process.env.NEXT_PUBLIC_CONTACTGATE_URL || 'http://localhost:3001'
  
  // Build the full path - ContactGate has basePath /contacts in production
  const targetEndpoint = `${targetUrl}/contacts`
  
  // Use shared proxy handler with path segments
  return await SharedProxyHandler.handleRequest(request, targetEndpoint, method, pathSegments)
}