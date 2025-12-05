import { NextResponse } from 'next/server';

/**
 * Simple test route to verify API routing is working
 */
export async function GET() {
  return NextResponse.json({ message: 'AI API routes are working!' });
}

