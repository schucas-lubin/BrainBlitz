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

    // Return mock MMD content
    const mockMmd = `# Mock Session Content

This is a **mock Mathpix Markdown** response for development purposes.

## Extracted Content

The uploaded file "${file.name}" (${file.type}, ${(file.size / 1024).toFixed(2)} KB) would normally be processed by Mathpix to extract:

- Text content
- Mathematical equations (LaTeX)
- Tables
- Figures
- Chemistry diagrams (SMILES)

## Next Steps

Once the real Mathpix API is integrated:

1. This route will call \`https://api.mathpix.com/v3/text\`
2. Use \`MATHPIX_APP_ID\` and \`MATHPIX_APP_KEY\` environment variables
3. Return the actual extracted MMD content
4. Store the MMD in the session's \`raw_mmd\` field in Supabase

## Example Equation

Here's an example of what a real equation might look like in MMD:

$$E = mc^2$$

And a table:

| Column 1 | Column 2 |
|----------|----------|
| Value 1  | Value 2  |
`;

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

