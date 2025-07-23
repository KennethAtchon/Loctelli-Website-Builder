import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const API_KEY = process.env.API_KEY; // Server-side only, not NEXT_PUBLIC

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams.path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams.path, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams.path, 'PUT');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams.path, 'PATCH');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams.path, 'DELETE');
}

async function handleRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  try {
    // Construct the backend URL
    const path = pathSegments.join('/');
    const url = `${BACKEND_URL}/${path}`;
    
    // Get the search params from the original request
    const searchParams = request.nextUrl.searchParams.toString();
    const fullUrl = searchParams ? `${url}?${searchParams}` : url;

    // Prepare headers
    const headers: Record<string, string> = {};
    
    // Don't set Content-Type for FormData - let the browser set it
    const contentType = request.headers.get('content-type');
    if (contentType && !contentType.includes('multipart/form-data')) {
      headers['Content-Type'] = contentType;
    }


    // Add API key to backend request
    if (API_KEY) {
      headers['x-api-key'] = API_KEY;
    } else {
      logger.error('❌ API_KEY is not set in environment variables');
      return NextResponse.json(
        { error: 'Server configuration error', message: 'API key not configured' },
        { status: 500 }
      );
    }

    // Forward user authentication headers if present
    const userToken = request.headers.get('x-user-token');
    if (userToken) {
      headers['x-user-token'] = userToken;
    }

    // Get request body if it exists
    let body: string | FormData | undefined;
    if (method !== 'GET' && method !== 'DELETE') {
      try {
        const contentType = request.headers.get('content-type');
        if (contentType && contentType.includes('multipart/form-data')) {
          // For FormData, pass it directly
          body = await request.formData();
        } else {
          // For other content types, get as text
          body = await request.text();
        }
      } catch {
        // No body to forward
      }
    }

    // Make request to backend
    const response = await fetch(fullUrl, {
      method,
      headers,
      body,
    });

    // Get response data
    const responseData = await response.text();
    
    // Try to parse as JSON, fallback to text
    let data;
    try {
      data = JSON.parse(responseData);
    } catch {
      data = responseData;
    }

    // Return response with same status and data
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });

  } catch (error) {
    logger.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to proxy request' },
      { status: 500 }
    );
  }
} 