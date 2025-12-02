import { NextRequest, NextResponse } from 'next/server';
import { getRequiredEnv } from '@/lib/env';

// TODO: Replace with real Mathpix API integration
// This route currently mocks the Mathpix response for development

export async function POST(request: NextRequest) {
  try {
    // Validate that Mathpix credentials are configured
    // This will throw a clear error if env vars are missing, making misconfiguration obvious
    const appId = getRequiredEnv('MATHPIX_APP_ID');
    const appKey = getRequiredEnv('MATHPIX_APP_KEY');

    // Parse multipart/form-data to get the uploaded file
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a PDF or image file.' },
        { status: 400 }
      );
    }

    // TODO: Replace this mock with real Mathpix API call
    // When ready, use appId and appKey from env vars above:
    //
    // const mathpixFormData = new FormData();
    // mathpixFormData.append('file', file);
    //
    // const mathpixResponse = await fetch('https://api.mathpix.com/v3/text', {
    //   method: 'POST',
    //   headers: {
    //     'app_id': appId,
    //     'app_key': appKey,
    //   },
    //   body: mathpixFormData,
    // });
    //
    // if (!mathpixResponse.ok) {
    //   const errorData = await mathpixResponse.json();
    //   throw new Error(`Mathpix API error: ${errorData.error || mathpixResponse.statusText}`);
    // }
    //
    // const mathpixData = await mathpixResponse.json();
    // return NextResponse.json({ rawMmd: mathpixData.text });

    // Mock response - simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Return simple mock MMD content
    // This matches the expected client-facing contract: { rawMmd: string }
    const mockMmd = [
      '# Mock Session',
      '',
      'This is extracted content from Mathpix (mock).',
      '',
      'You can replace this with real MMD later.',
      '',
      `The uploaded file "${file.name}" has been processed and converted to Mathpix Markdown format.`,
    ].join('\n');

    return NextResponse.json({ rawMmd: mockMmd });
  } catch (error: any) {
    console.error('Mathpix route error:', error);
    
    // Return consistent error shape
    return NextResponse.json(
      {
        error: 'Mathpix route misconfigured or failed',
        details: error?.message ?? 'Unknown error',
      },
      { status: 500 }
    );
  }
}
