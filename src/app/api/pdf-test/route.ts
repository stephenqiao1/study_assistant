import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'PDF API test route is working' });
}

export async function POST() {
  return NextResponse.json({ status: 'ok', message: 'PDF API POST test route is working' });
} 