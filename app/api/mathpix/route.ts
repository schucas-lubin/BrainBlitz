import { NextRequest, NextResponse } from 'next/server';
import { getRequiredEnv } from '@/lib/env';

const MATHPIX_API_BASE = 'https://api.mathpix.com';

/**
 * Mathpix API Route Handler
 * 
 * Handles both PDF and image processing:
 * - PDFs: Async processing (upload → poll → retrieve)
 * - Images: Synchronous processing
 */

interface MathpixErrorResponse {
  error: string;
  error_info?: {
    id: string;
    message: string;
  };
}

interface MathpixImageResponse {
  text: string;
  confidence?: number;
  confidence_rate?: number;
  is_printed?: boolean;
  is_handwritten?: boolean;
  image_width?: number;
  image_height?: number;
  request_id?: string;
  version?: string;
}

interface MathpixPdfUploadResponse {
  pdf_id: string;
  status: string;
}

interface MathpixPdfStatusResponse {
  pdf_id: string;
  status: 'processing' | 'completed' | 'error' | 'timeout';
  num_pages?: number;
  error?: string;
}

/**
 * Retry helper for transient errors
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on client errors (4xx) except 429
      const status = error.status || error.response?.status;
      if (status && status >= 400 && status < 500 && status !== 429) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries - 1) {
        throw error;
      }

      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`[Mathpix] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Process an image file synchronously using v3/text endpoint
 */
async function processImage(
  file: File,
  appId: string,
  appKey: string,
  options?: { formats?: string[]; data_options?: any }
): Promise<MathpixImageResponse> {
  return retryWithBackoff(async () => {
    // Convert File to Blob for proper FormData handling
    const fileBlob = file instanceof Blob ? file : new Blob([await file.arrayBuffer()], { type: file.type });
    
    const formData = new FormData();
    formData.append('file', fileBlob, file.name || 'image.jpg');

    const requestOptions: any = {
      formats: options?.formats || ['text'],
    };

    if (options?.data_options) {
      requestOptions.data_options = options.data_options;
    }

    formData.append('options_json', JSON.stringify(requestOptions));

    console.log('[Mathpix] Sending image to Mathpix API...');
    const response = await fetch(`${MATHPIX_API_BASE}/v3/text`, {
      method: 'POST',
      headers: {
        app_id: appId,
        app_key: appKey,
      },
      body: formData,
    });

    console.log('[Mathpix] Image API response status:', response.status);

    if (!response.ok) {
      const errorData: MathpixErrorResponse = await response.json().catch(() => ({
        error: response.statusText,
      }));
      
      console.error('[Mathpix] Image API error:', errorData);
      
      const error: any = new Error(
        errorData.error || `Mathpix API error: ${response.statusText}`
      );
      error.status = response.status;
      error.response = { status: response.status };
      throw error;
    }

    return response.json();
  });
}

/**
 * Upload a PDF and return pdf_id
 */
async function uploadPdf(
  file: File,
  appId: string,
  appKey: string,
  options?: { formats?: string[]; ocr?: string[] }
): Promise<MathpixPdfUploadResponse> {
  return retryWithBackoff(async () => {
    // Convert File to Blob for proper FormData handling
    // This ensures compatibility when forwarding to external APIs
    const fileBlob = file instanceof Blob ? file : new Blob([await file.arrayBuffer()], { type: file.type });
    
    const formData = new FormData();
    formData.append('file', fileBlob, file.name || 'document.pdf');

    const requestOptions: any = {
      formats: options?.formats || ['text', 'mmd'],
      ocr: options?.ocr || ['math', 'text', 'tables'],
    };

    formData.append('options_json', JSON.stringify(requestOptions));

    console.log('[Mathpix] Uploading PDF to Mathpix API...');
    const response = await fetch(`${MATHPIX_API_BASE}/v3/pdf`, {
      method: 'POST',
      headers: {
        app_id: appId,
        app_key: appKey,
      },
      body: formData,
    });

    console.log('[Mathpix] PDF upload API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Mathpix] PDF upload error response:', errorText);
      
      let errorData: MathpixErrorResponse;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: response.statusText };
      }
      
      const error: any = new Error(
        errorData.error || `PDF upload failed: ${response.statusText}`
      );
      error.status = response.status;
      error.response = { status: response.status };
      throw error;
    }

    const result = await response.json();
    console.log('[Mathpix] PDF upload successful, pdf_id:', result.pdf_id);
    return result;
  });
}

/**
 * Check PDF processing status
 */
async function checkPdfStatus(
  pdfId: string,
  appId: string,
  appKey: string
): Promise<MathpixPdfStatusResponse> {
  const response = await fetch(`${MATHPIX_API_BASE}/v3/pdf/${pdfId}`, {
    method: 'GET',
    headers: {
      app_id: appId,
      app_key: appKey,
    },
  });

  if (!response.ok) {
    const errorData: MathpixErrorResponse = await response.json().catch(() => ({
      error: response.statusText,
    }));
    throw new Error(
      errorData.error || `Status check failed: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Retrieve PDF results in specified format
 * 
 * Format should be a file extension (e.g., 'mmd', 'md', 'html', 'tex.zip')
 * NOT a path segment. Mathpix uses extensions: /v3/pdf/{pdf_id}.{extension}
 */
async function getPdfResults(
  pdfId: string,
  format: string,
  appId: string,
  appKey: string
): Promise<string> {
  // Mathpix requires file extensions, not path segments
  // Correct: /v3/pdf/{pdf_id}.mmd
  // Wrong:   /v3/pdf/{pdf_id}/mmd
  const url = `${MATHPIX_API_BASE}/v3/pdf/${pdfId}.${format}`;
  console.log(`[Mathpix] Fetching results from: ${url}`);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      app_id: appId,
      app_key: appKey,
    },
  });

  console.log(`[Mathpix] Results API response status: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Mathpix] Results API error response: ${errorText}`);
    
    let errorData: MathpixErrorResponse;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { error: response.statusText };
    }
    
    throw new Error(
      errorData.error || `Failed to retrieve results: ${response.statusText}`
    );
  }

  return response.text();
}

/**
 * Poll PDF status until completion
 */
async function pollPdfStatus(
  pdfId: string,
  appId: string,
  appKey: string,
  maxAttempts: number = 120,
  pollInterval: number = 2000
): Promise<MathpixPdfStatusResponse> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const status = await checkPdfStatus(pdfId, appId, appKey);

    if (status.status === 'completed') {
      return status;
    }

    if (status.status === 'error' || status.status === 'timeout') {
      throw new Error(
        `PDF processing failed: ${status.status}${status.error ? ` - ${status.error}` : ''}`
      );
    }

    // Wait before next poll
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }

  throw new Error('PDF processing timeout - exceeded maximum polling attempts');
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Mathpix] Request received');
    
    // Validate that Mathpix credentials are configured
    let appId: string;
    let appKey: string;
    try {
      appId = getRequiredEnv('MATHPIX_APP_ID');
      appKey = getRequiredEnv('MATHPIX_APP_KEY');
      console.log('[Mathpix] Credentials loaded, appId length:', appId.length);
    } catch (error: any) {
      console.error('[Mathpix] Credential error:', error.message);
      return NextResponse.json(
        {
          error: 'Mathpix API is not configured',
          details: error.message,
        },
        { status: 500 }
      );
    }

    // Parse multipart/form-data to get the uploaded file
    console.log('[Mathpix] Parsing form data...');
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const optionsJsonStr = formData.get('options_json') as string | null;

    if (!file) {
      console.error('[Mathpix] No file in request');
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log('[Mathpix] File received:', {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    // Validate file type
    const validTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/gif',
      'image/webp',
    ];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a PDF or image file.' },
        { status: 400 }
      );
    }

    // Parse options if provided
    let options: any = null;
    if (optionsJsonStr) {
      try {
        options = JSON.parse(optionsJsonStr);
      } catch (e) {
        console.warn('Failed to parse options_json:', e);
      }
    }

    const isPdf = file.type === 'application/pdf';

    if (isPdf) {
      // PDF Processing: Upload → Poll → Retrieve
      console.log(`[Mathpix] Processing PDF: ${file.name} (${file.size} bytes)`);

      // 1. Upload PDF
      const uploadResult = await uploadPdf(file, appId, appKey, options);
      const pdfId = uploadResult.pdf_id;
      console.log(`[Mathpix] PDF uploaded, pdf_id: ${pdfId}`);

      // 2. Poll for completion
      const maxAttempts = options?.maxPollAttempts || 120; // Default 4 minutes
      const pollInterval = options?.pollInterval || 2000; // Default 2 seconds
      
      console.log(`[Mathpix] Polling PDF status (max ${maxAttempts} attempts, ${pollInterval}ms interval)`);
      const statusResult = await pollPdfStatus(pdfId, appId, appKey, maxAttempts, pollInterval);
      console.log(`[Mathpix] PDF processing completed: ${statusResult.status}`);

      // 3. Retrieve results (prefer MMD, fallback to plain markdown)
      // Map format names to file extensions as required by Mathpix API
      // 'text' format should use '.md' extension, 'mmd' uses '.mmd'
      const formatName = options?.formats?.includes('mmd') ? 'mmd' : 'text';
      const formatExtension = formatName === 'text' ? 'md' : 'mmd';
      const rawMmd = await getPdfResults(pdfId, formatExtension, appId, appKey);
      console.log(`[Mathpix] Retrieved PDF results (${formatExtension}), length: ${rawMmd.length}`);

      return NextResponse.json({
        rawMmd,
        requestId: pdfId,
        metadata: {
          numPages: statusResult.num_pages,
        },
      });
    } else {
      // Image Processing: Synchronous
      console.log(`[Mathpix] Processing image: ${file.name} (${file.size} bytes)`);

      const imageResult = await processImage(file, appId, appKey, options);
      console.log(
        `[Mathpix] Image processed, confidence: ${imageResult.confidence}, request_id: ${imageResult.request_id}`
      );

      return NextResponse.json({
        rawMmd: imageResult.text,
        requestId: imageResult.request_id,
        confidence: imageResult.confidence,
        metadata: {
          isPrinted: imageResult.is_printed,
          isHandwritten: imageResult.is_handwritten,
          imageWidth: imageResult.image_width,
          imageHeight: imageResult.image_height,
        },
      });
    }
  } catch (error: any) {
    console.error('[Mathpix] Route error:', error);

    // Extract error details and determine status code
    const errorMessage = error?.message || 'Unknown error';
    const status = error?.status || error?.response?.status;
    
    let statusCode = 500;
    let userMessage = 'Mathpix extraction failed';

    if (status) {
      statusCode = status;
    } else if (errorMessage.includes('401') || errorMessage.includes('Invalid credentials')) {
      statusCode = 401;
      userMessage = 'Invalid API credentials. Please check your Mathpix configuration.';
    } else if (errorMessage.includes('400') || errorMessage.includes('Bad Request')) {
      statusCode = 400;
      userMessage = 'Invalid request. Please check your file format and try again.';
    } else if (errorMessage.includes('413') || errorMessage.includes('too large')) {
      statusCode = 413;
      userMessage = 'File is too large. Please use a smaller file (max 5MB for images, varies for PDFs).';
    } else if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
      statusCode = 429;
      userMessage = 'Rate limit exceeded. Please wait a moment and try again.';
    } else if (errorMessage.includes('timeout')) {
      statusCode = 504;
      userMessage = 'Processing timeout. The file may be too large or complex.';
    } else if (errorMessage.includes('Missing required env')) {
      statusCode = 500;
      userMessage = 'Mathpix API is not configured. Please set MATHPIX_APP_ID and MATHPIX_APP_KEY.';
    }

    return NextResponse.json(
      {
        error: userMessage,
        details: errorMessage,
        statusCode,
      },
      { status: statusCode }
    );
  }
}
