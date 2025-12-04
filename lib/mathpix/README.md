# Mathpix Integration

This directory contains the Mathpix API client and related utilities for extracting content from PDFs and images to Mathpix Markdown (MMD).

## Overview

The Mathpix integration supports:
- **PDF Processing**: Asynchronous workflow (upload → poll → retrieve)
- **Image Processing**: Synchronous OCR for individual images
- **Error Handling**: Comprehensive error handling with retry logic
- **Debugging**: Test endpoints and utilities for verification

## API Routes

### POST `/api/mathpix`

Main endpoint for processing files. Handles both PDFs and images automatically.

**Request:**
- `file`: PDF or image file (multipart/form-data)
- `options_json` (optional): JSON string with processing options

**Response:**
```json
{
  "rawMmd": "extracted content in Mathpix Markdown format",
  "requestId": "request_id_from_mathpix",
  "confidence": 0.95,
  "metadata": {
    "isPrinted": true,
    "isHandwritten": false,
    "imageWidth": 800,
    "imageHeight": 600
  }
}
```

### GET `/api/mathpix/test`

Test endpoint to verify API connectivity and credentials.

**Response:**
```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "tests": [
    {
      "name": "Environment Variables",
      "status": "pass",
      "message": "MATHPIX_APP_ID and MATHPIX_APP_KEY are configured"
    },
    {
      "name": "API Credentials",
      "status": "pass",
      "message": "Credentials are valid"
    },
    {
      "name": "API Connectivity",
      "status": "pass",
      "message": "Successfully connected to Mathpix API"
    }
  ],
  "overall": "pass"
}
```

### GET `/api/mathpix/debug`

Debug endpoint to view configuration without making API calls.

## Client Library

### `extractToMmd(file, options?)`

Main function to extract content from a file.

```typescript
import { extractToMmd } from '@/lib/mathpix/client';

const result = await extractToMmd(file, {
  formats: ['text', 'mmd'],
  ocr: ['math', 'text', 'tables'],
});

console.log(result.rawMmd);
```

## Environment Variables

Required environment variables:

```bash
MATHPIX_APP_ID=your_app_id
MATHPIX_APP_KEY=your_app_key
```

These should be set in `.env.local` (for development) or your hosting platform's environment variables (for production).

## Testing

Visit `/mathpix-test` to access the test page, which provides:
1. Connectivity test to verify credentials
2. Debug information viewer
3. File upload test interface

## Supported File Types

- **PDFs**: `application/pdf`
- **Images**: `image/png`, `image/jpeg`, `image/jpg`, `image/gif`, `image/webp`

## Error Handling

The integration handles common errors:
- **401 Unauthorized**: Invalid or missing credentials
- **400 Bad Request**: Invalid file type or malformed request
- **413 Payload Too Large**: File exceeds size limits
- **429 Too Many Requests**: Rate limit exceeded (with retry logic)
- **500+ Server Errors**: Temporary server issues (with retry logic)

## Best Practices

1. **File Size**: Keep images under 100KB for best latency
2. **PDF Processing**: Large PDFs can take several minutes - be patient
3. **Error Handling**: Always handle errors gracefully in your UI
4. **Credentials**: Never expose API keys in client-side code
5. **Testing**: Use the test endpoints to verify configuration before processing files

## References

- [Mathpix API Documentation](https://docs.mathpix.com)
- [Mathpix Console](https://console.mathpix.com)
- Integration documentation in `/info copy/` directory

