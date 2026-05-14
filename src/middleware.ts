import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple in-memory rate limiting for the Edge Runtime
// Note: This is per-instance, but effective for basic bot mitigation
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

const LIMIT = 50; // Max requests per window
const WINDOW = 60 * 1000; // 1 minute window

export function middleware(request: NextRequest) {
  // Only apply to API routes or the main page if needed
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.ip || '127.0.0.1';
    const now = Date.now();
    
    const record = rateLimitMap.get(ip) || { count: 0, lastReset: now };
    
    if (now - record.lastReset > WINDOW) {
      record.count = 0;
      record.lastReset = now;
    }
    
    record.count++;
    rateLimitMap.set(ip, record);
    
    if (record.count > LIMIT) {
      return new NextResponse('Too Many Requests', { status: 429 });
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
