// TODO: Replace with real Mathpix API integration
// This is a placeholder that will call the local /api/mathpix route

export interface ExtractToMmdResult {
  rawMmd: string;
}

/**
 * Extracts content from a PDF or image file to Mathpix Markdown (MMD).
 * Currently calls the local API route which mocks the Mathpix response.
 * 
 * TODO: Replace with direct Mathpix API call using MATHPIX_APP_ID and MATHPIX_APP_KEY
 */
export async function extractToMmd(file: File | Blob): Promise<ExtractToMmdResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/mathpix', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Mathpix extraction failed: ${response.statusText}`);
  }

  const data = await response.json();
  return { rawMmd: data.rawMmd };
}

