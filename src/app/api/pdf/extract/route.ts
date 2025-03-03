import { NextRequest, NextResponse } from 'next/server'

// Set these to prevent Next.js from attempting to prerender
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Simple function to handle GET requests
export function GET() {
  return NextResponse.json({ message: 'This API route requires a POST request with a PDF file' });
}

// A completely simplified version of the route that will only load dependencies at runtime
export async function POST(request: NextRequest) {
  try {
    // Only import pdf-parse at runtime, not during build
    if (typeof window === 'undefined' && request?.body) {
      // Dynamically import the actual implementation
      const { processExtractRequest } = await import('@/utils/pdf-extract');
      return processExtractRequest(request);
    }
    
    // Return a simple response during build time
    return NextResponse.json({ message: 'PDF processing is only available at runtime' });
  } catch (error) {
    console.error('Error in PDF extract route:', error);
    return NextResponse.json(
      { error: 'Server error processing PDF' },
      { status: 500 }
    );
  }
} 