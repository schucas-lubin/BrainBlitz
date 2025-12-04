import { NextRequest, NextResponse } from 'next/server';
import { getRequiredEnv } from '@/lib/env';

const MATHPIX_API_BASE = 'https://api.mathpix.com';

/**
 * Mathpix Test/Diagnostics Endpoint
 * 
 * GET /api/mathpix/test - Test Mathpix API connectivity and credentials
 * 
 * This endpoint helps verify:
 * - Environment variables are configured
 * - API credentials are valid
 * - API connectivity is working
 * 
 * Can be removed after confirming everything works.
 */

export async function GET(request: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: [],
    overall: 'unknown',
  };

  try {
    // Test 1: Check environment variables
    let appId: string | null = null;
    let appKey: string | null = null;

    try {
      appId = getRequiredEnv('MATHPIX_APP_ID');
      appKey = getRequiredEnv('MATHPIX_APP_KEY');
      results.tests.push({
        name: 'Environment Variables',
        status: 'pass',
        message: 'MATHPIX_APP_ID and MATHPIX_APP_KEY are configured',
        details: {
          appIdLength: appId.length,
          appKeyLength: appKey.length,
          appIdPrefix: appId.substring(0, 4) + '...',
        },
      });
    } catch (error: any) {
      results.tests.push({
        name: 'Environment Variables',
        status: 'fail',
        message: error.message,
      });
      results.overall = 'fail';
      return NextResponse.json(results, { status: 500 });
    }

    // Test 2: Test app token creation (validates credentials)
    try {
      const tokenResponse = await fetch(`${MATHPIX_API_BASE}/v3/app-tokens`, {
        method: 'POST',
        headers: {
          app_key: appKey!,
        },
      });

      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        results.tests.push({
          name: 'API Credentials',
          status: 'pass',
          message: 'Credentials are valid',
          details: {
            appTokenReceived: !!tokenData.app_token,
            expiresAt: tokenData.app_token_expires_at,
          },
        });
      } else {
        const errorData = await tokenResponse.json().catch(() => ({}));
        results.tests.push({
          name: 'API Credentials',
          status: 'fail',
          message: `Invalid credentials: ${tokenResponse.status} ${tokenResponse.statusText}`,
          details: errorData,
        });
        results.overall = 'fail';
      }
    } catch (error: any) {
      results.tests.push({
        name: 'API Credentials',
        status: 'error',
        message: `Failed to test credentials: ${error.message}`,
      });
      results.overall = 'fail';
    }

    // Test 3: Test API connectivity (simple status check)
    try {
      // Use a known endpoint that doesn't require a file
      const testResponse = await fetch(`${MATHPIX_API_BASE}/v3/app-tokens`, {
        method: 'POST',
        headers: {
          app_key: appKey!,
        },
      });

      results.tests.push({
        name: 'API Connectivity',
        status: testResponse.ok ? 'pass' : 'fail',
        message: testResponse.ok
          ? 'Successfully connected to Mathpix API'
          : `Connection failed: ${testResponse.status}`,
        details: {
          status: testResponse.status,
          statusText: testResponse.statusText,
        },
      });

      if (!testResponse.ok) {
        results.overall = 'fail';
      }
    } catch (error: any) {
      results.tests.push({
        name: 'API Connectivity',
        status: 'error',
        message: `Network error: ${error.message}`,
      });
      results.overall = 'fail';
    }

    // Determine overall status
    if (results.overall === 'unknown') {
      const allPassed = results.tests.every((t: any) => t.status === 'pass');
      results.overall = allPassed ? 'pass' : 'partial';
    }

    const statusCode = results.overall === 'pass' ? 200 : 500;
    return NextResponse.json(results, { status: statusCode });
  } catch (error: any) {
    results.tests.push({
      name: 'Unexpected Error',
      status: 'error',
      message: error.message,
    });
    results.overall = 'fail';
    return NextResponse.json(results, { status: 500 });
  }
}

