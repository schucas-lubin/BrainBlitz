/**
 * Mathpix API Client
 * 
 * Handles extraction of content from PDFs and images to Mathpix Markdown (MMD).
 * Uses the local API route which proxies requests to Mathpix with proper authentication.
 */

export interface ExtractToMmdResult {
  rawMmd: string;
  requestId?: string;
  confidence?: number;
  metadata?: {
    isPrinted?: boolean;
    isHandwritten?: boolean;
    imageWidth?: number;
    imageHeight?: number;
  };
}

export interface MathpixError {
  error: string;
  errorInfo?: {
    id: string;
    message: string;
  };
}

/**
 * Extracts content from a PDF or image file to Mathpix Markdown (MMD).
 * 
 * For PDFs: Handles async processing (upload → poll → retrieve)
 * For images: Returns results immediately
 * 
 * @param file - PDF or image file to process
 * @param options - Optional processing options
 * @returns Extracted MMD content with metadata
 * @throws Error if extraction fails
 */
export async function extractToMmd(
  file: File | Blob,
  options?: {
    formats?: string[];
    ocr?: string[];
    maxPollAttempts?: number;
    pollInterval?: number;
  }
): Promise<ExtractToMmdResult> {
  const formData = new FormData();
  formData.append('file', file);

  // Add options if provided
  if (options) {
    const optionsJson: any = {};
    if (options.formats) {
      optionsJson.formats = options.formats;
    }
    if (options.ocr) {
      optionsJson.ocr = options.ocr;
    }
    if (Object.keys(optionsJson).length > 0) {
      formData.append('options_json', JSON.stringify(optionsJson));
    }
  }

  const response = await fetch('/api/mathpix', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData: MathpixError = await response.json().catch(() => ({
      error: response.statusText,
    }));
    
    throw new Error(
      errorData.error || `Mathpix extraction failed: ${response.statusText}`
    );
  }

  const data = await response.json();
  return {
    rawMmd: data.rawMmd,
    requestId: data.requestId,
    confidence: data.confidence,
    metadata: data.metadata,
  };
}

/**
 * Checks if a file is a PDF
 */
export function isPdf(file: File | Blob): boolean {
  return file.type === 'application/pdf';
}

/**
 * Checks if a file is an image
 */
export function isImage(file: File | Blob): boolean {
  return file.type.startsWith('image/');
}

