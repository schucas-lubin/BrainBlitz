import { NextRequest, NextResponse } from 'next/server';
import { getRequiredEnv } from '@/lib/env';

/**
 * Mathpix Debug Endpoint
 * 
 * GET /api/mathpix/debug - Returns debug information about Mathpix configuration
 * 
 * This endpoint provides debugging information without making API calls.
 * Useful for verifying configuration without using API credits.
 * 
 * Can be removed after confirming everything works.
 */

export async function GET(request: NextRequest) {
  const debug: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    configuration: {},
    warnings: [],
  };

  try {
    // Check environment variables (without throwing)
    const appId = process.env.MATHPIX_APP_ID;
    const appKey = process.env.MATHPIX_APP_KEY;

    debug.configuration = {
      appId: {
        configured: !!appId,
        length: appId?.length || 0,
        preview: appId ? `${appId.substring(0, 4)}...` : 'not set',
      },
      appKey: {
        configured: !!appKey,
        length: appKey?.length || 0,
        preview: appKey ? `${appKey.substring(0, 4)}...` : 'not set',
      },
    };

    if (!appId) {
      debug.warnings.push('MATHPIX_APP_ID is not configured');
    }
    if (!appKey) {
      debug.warnings.push('MATHPIX_APP_KEY is not configured');
    }

    // Check if we can access the env helper
    try {
      getRequiredEnv('MATHPIX_APP_ID');
      getRequiredEnv('MATHPIX_APP_KEY');
      debug.configuration.envHelper = 'working';
    } catch (error: any) {
      debug.configuration.envHelper = `error: ${error.message}`;
    }

    // Add API endpoint info
    debug.endpoints = {
      image: 'POST https://api.mathpix.com/v3/text',
      pdf: {
        upload: 'POST https://api.mathpix.com/v3/pdf',
        status: 'GET https://api.mathpix.com/v3/pdf/{pdf_id}',
        results: 'GET https://api.mathpix.com/v3/pdf/{pdf_id}/{format}',
      },
      test: 'GET /api/mathpix/test',
    };

    return NextResponse.json(debug);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Debug endpoint failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

