'use client';

/**
 * Mathpix Integration Test Page
 * 
 * This page provides a simple UI to test Mathpix integration:
 * - Test API connectivity and credentials
 * - Upload and process test files
 * - View debug information
 * 
 * Can be removed after confirming everything works.
 */

import { useState } from 'react';
import MathpixUploader from '@/components/MathpixUploader';

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

export default function MathpixTestPage() {
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testResults, setTestResults] = useState<any>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [extractedMmd, setExtractedMmd] = useState<string | null>(null);

  const runConnectivityTest = async () => {
    setTestStatus('testing');
    setTestResults(null);

    try {
      const response = await fetch('/api/mathpix/test');
      const data = await response.json();
      setTestResults(data);
      setTestStatus(data.overall === 'pass' ? 'success' : 'error');
    } catch (error: any) {
      setTestResults({ error: error.message });
      setTestStatus('error');
    }
  };

  const loadDebugInfo = async () => {
    try {
      const response = await fetch('/api/mathpix/debug');
      const data = await response.json();
      setDebugInfo(data);
    } catch (error: any) {
      console.error('Failed to load debug info:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Mathpix Integration Test</h1>

      {/* Connectivity Test Section */}
      <section className="mb-8 p-6 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">1. Connectivity Test</h2>
        <p className="text-sm text-gray-600 mb-4">
          Test API credentials and connectivity without processing files.
        </p>
        <button
          onClick={runConnectivityTest}
          disabled={testStatus === 'testing'}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {testStatus === 'testing' ? 'Testing...' : 'Run Test'}
        </button>

        {testResults && (
          <div className="mt-4 p-4 bg-gray-50 rounded">
            <div className="mb-2">
              <span className="font-semibold">Overall Status: </span>
              <span
                className={
                  testResults.overall === 'pass'
                    ? 'text-green-600'
                    : testResults.overall === 'fail'
                    ? 'text-red-600'
                    : 'text-yellow-600'
                }
              >
                {testResults.overall.toUpperCase()}
              </span>
            </div>
            <div className="space-y-2">
              {testResults.tests?.map((test: any, idx: number) => (
                <div key={idx} className="text-sm">
                  <span className="font-medium">{test.name}: </span>
                  <span
                    className={
                      test.status === 'pass'
                        ? 'text-green-600'
                        : test.status === 'fail'
                        ? 'text-red-600'
                        : 'text-yellow-600'
                    }
                  >
                    {test.status}
                  </span>
                  <div className="text-gray-600 ml-4">{test.message}</div>
                  {test.details && (
                    <pre className="text-xs bg-white p-2 rounded mt-1 overflow-auto">
                      {JSON.stringify(test.details, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Debug Info Section */}
      <section className="mb-8 p-6 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">2. Debug Information</h2>
        <button
          onClick={loadDebugInfo}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Load Debug Info
        </button>

        {debugInfo && (
          <div className="mt-4 p-4 bg-gray-50 rounded">
            <pre className="text-xs overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}
      </section>

      {/* File Upload Test Section */}
      <section className="mb-8 p-6 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">3. File Upload Test</h2>
        <p className="text-sm text-gray-600 mb-4">
          Upload a PDF or image file to test the full extraction pipeline.
        </p>
        <MathpixUploader
          onUploadComplete={(rawMmd) => {
            setExtractedMmd(rawMmd);
          }}
          onError={(error) => {
            console.error('Upload error:', error);
          }}
        />

        {extractedMmd && (
          <div className="mt-4 p-4 bg-gray-50 rounded">
            <h3 className="font-semibold mb-2">Extracted MMD:</h3>
            <div className="text-sm bg-white p-4 rounded border max-h-96 overflow-auto">
              <pre className="whitespace-pre-wrap">{extractedMmd}</pre>
            </div>
            <div className="mt-2 text-xs text-gray-600">
              Length: {extractedMmd.length} characters
            </div>
          </div>
        )}
      </section>

      {/* Instructions */}
      <section className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Instructions</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Run the connectivity test to verify API credentials are configured correctly</li>
          <li>Check debug information to see configuration details</li>
          <li>Upload a test PDF or image file to verify the full extraction pipeline</li>
          <li>Once everything works, you can remove this test page</li>
        </ol>
      </section>
    </div>
  );
}

