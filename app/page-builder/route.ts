import { NextRequest, NextResponse } from 'next/server'
import { SharedProxyHandler } from '@/lib/proxy/shared-proxy-handler'

// This file handles /page-builder (root path)
// The [...path]/route.ts handles /page-builder/* (sub paths)

export async function GET(request: NextRequest) {
  return handleProxyRequest(request, 'GET')
}

export async function POST(request: NextRequest) {
  return handleProxyRequest(request, 'POST')
}

export async function PUT(request: NextRequest) {
  return handleProxyRequest(request, 'PUT')
}

export async function DELETE(request: NextRequest) {
  return handleProxyRequest(request, 'DELETE')
}

export async function PATCH(request: NextRequest) {
  return handleProxyRequest(request, 'PATCH')
}

async function handleProxyRequest(
  request: NextRequest,
  method: string
) {
  // Get the target URL from environment or default
  const targetUrl = process.env.PAGE_BUILDER_URL || 'http://localhost:3002'
  
  // For root path, proxy to /page-builder on the target
  const targetEndpoint = `${targetUrl}/page-builder`
  
  // Use shared proxy handler
  return await SharedProxyHandler.handleRequest(request, targetEndpoint, method)
}