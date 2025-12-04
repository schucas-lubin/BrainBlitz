import { NextRequest, NextResponse } from 'next/server';
import { getRequiredEnv } from '@/lib/env';

/**
 * Test Upload Endpoint
 * 
 * Simple endpoint to test file upload handling without calling Mathpix
 * Helps debug FormData parsing issues
 */

export async function POST(request: NextRequest) {
  try {
    console.log('[Test] Request received');
    
    // Check credentials
    try {
      const appId = getRequiredEnv('MATHPIX_APP_ID');
      const appKey = getRequiredEnv('MATHPIX_APP_KEY');
      console.log('[Test] Credentials OK, appId length:', appId.length);
    } catch (error: any) {
      return NextResponse.json(
        { error: 'Credentials not configured', details: error.message },
        { status: 500 }
      );
    }

    // Parse form data
    console.log('[Test] Parsing form data...');
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log('[Test] File received:', {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    // Try to read file
    try {
      const arrayBuffer = await file.arrayBuffer();
      console.log('[Test] File read successfully, size:', arrayBuffer.byteLength);
      
      return NextResponse.json({
        success: true,
        file: {
          name: file.name,
          type: file.type,
          size: file.size,
          bufferSize: arrayBuffer.byteLength,
        },
        message: 'File received and read successfully',
      });
    } catch (error: any) {
      console.error('[Test] Error reading file:', error);
      return NextResponse.json(
        {
          error: 'Failed to read file',
          details: error.message,
          stack: error.stack,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[Test] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Test endpoint failed',
        details: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}

