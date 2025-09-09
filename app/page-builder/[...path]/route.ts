import { NextRequest, NextResponse } from 'next/server'
import { SharedProxyHandler } from '@/lib/proxy/shared-proxy-handler'

// This file handles /page-builder/* routes directly without relying on rewrites
// It forwards to the proxy API internally

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params
  return handleProxyRequest(request, resolvedParams.path || [], 'GET')
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params
  return handleProxyRequest(request, resolvedParams.path || [], 'POST')
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params
  return handleProxyRequest(request, resolvedParams.path || [], 'PUT')
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params
  return handleProxyRequest(request, resolvedParams.path || [], 'DELETE')
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params
  return handleProxyRequest(request, resolvedParams.path || [], 'PATCH')
}

async function handleProxyRequest(
  request: NextRequest,
  path: string[],
  method: string
) {
  // Get the target URL from environment or default
  const targetUrl = process.env.PAGE_BUILDER_URL || 'http://localhost:3002'
  
  // Build the full path for the page builder app
  let targetEndpoint: string
  
  if (path.length === 0) {
    // Root path: /page-builder -> http://localhost:3002/page-builder
    targetEndpoint = `${targetUrl}/page-builder`
  } else {
    // Sub path: /page-builder/some/path -> http://localhost:3002/page-builder/some/path
    targetEndpoint = `${targetUrl}/page-builder`
  }
  
  // Use shared proxy handler with HTML modification for page-builder
  return await SharedProxyHandler.handleRequestWithHtmlModification(request, targetEndpoint, method, path)
}