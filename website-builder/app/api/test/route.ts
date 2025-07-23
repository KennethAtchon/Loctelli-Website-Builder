import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'API proxy is working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    hasBackendUrl: !!process.env.BACKEND_URL,
    hasApiKey: !!process.env.API_KEY,
  });
} 