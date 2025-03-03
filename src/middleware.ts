import { NextRequest, NextResponse } from 'next/server';

// Configuration for handling large uploads
export const config = {
  matcher: ['/api/pdf-extract', '/api/pdf-test']
};

export default function middleware(_req: NextRequest) {
  // Allow the request to proceed
  return NextResponse.next();
} 