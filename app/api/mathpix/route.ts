import { NextRequest, NextResponse } from 'next/server';

// TODO: Replace with real Mathpix API integration
// This route currently mocks the Mathpix response for development

export async function POST(request: NextRequest) {
  try {
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
    // Example real implementation would be:
    // const mathpixResponse = await fetch('https://api.mathpix.com/v3/text', {
    //   method: 'POST',
    //   headers: {
    //     'app_id': process.env.MATHPIX_APP_ID!,
    //     'app_key': process.env.MATHPIX_APP_KEY!,
    //   },
    //   body: formData,
    // });
    // const data = await mathpixResponse.json();
    // return NextResponse.json({ rawMmd: data.text });

    // Mock response - simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Return simple mock MMD content
    const mockMmd = `# Mock Session

This is extracted content from Mathpix (mock).

The uploaded file "${file.name}" has been processed and converted to Mathpix Markdown format.`;

    return NextResponse.json({
      rawMmd: mockMmd,
    });
  } catch (error) {
    console.error('Mathpix extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract content' },
      { status: 500 }
    );
  }
}
