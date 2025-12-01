'use client';

import { useState, useRef } from 'react';
import { extractToMmd } from '@/lib/mathpix/client';

type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

interface MathpixUploaderProps {
  onUploadComplete?: (rawMmd: string) => void;
  onError?: (error: Error) => void;
}

export default function MathpixUploader({
  onUploadComplete,
  onError,
}: MathpixUploaderProps) {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = async (file: File) => {
    // Validate file type
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      const error = new Error('Invalid file type. Please upload a PDF or image file.');
      setErrorMessage(error.message);
      setStatus('error');
      onError?.(error);
      return;
    }

    setStatus('uploading');
    setErrorMessage(null);

    try {
      const result = await extractToMmd(file);
      setStatus('done');
      onUploadComplete?.(result.rawMmd);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Upload failed');
      setErrorMessage(err.message);
      setStatus('error');
      onError?.(err);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const reset = () => {
    setStatus('idle');
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      {status === 'idle' && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.gif"
            onChange={handleFileInput}
            className="hidden"
            id="mathpix-file-input"
          />
          <label
            htmlFor="mathpix-file-input"
            className="cursor-pointer block"
          >
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-4h12m-4 4v12a4 4 0 01-4 4H16a4 4 0 01-4-4V16a4 4 0 014-4h12"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="text-sm text-gray-600 mb-2">
              <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">PDF or image files (PNG, JPG, GIF)</p>
          </label>
        </div>
      )}

      {status === 'uploading' && (
        <div className="border-2 border-blue-500 rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Uploading and extracting content...</p>
        </div>
      )}

      {status === 'done' && (
        <div className="border-2 border-green-500 bg-green-50 rounded-lg p-6 text-center">
          <svg
            className="mx-auto h-8 w-8 text-green-600 mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <p className="text-sm font-medium text-green-800 mb-2">
            Content extracted successfully!
          </p>
          <button
            onClick={reset}
            className="text-xs text-green-700 hover:text-green-800 underline"
          >
            Upload another file
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="border-2 border-red-500 bg-red-50 rounded-lg p-6">
          <p className="text-sm font-medium text-red-800 mb-2">Upload failed</p>
          <p className="text-xs text-red-600 mb-4">{errorMessage}</p>
          <button
            onClick={reset}
            className="text-xs text-red-700 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

