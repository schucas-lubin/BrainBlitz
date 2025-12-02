'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import MathpixUploader from '@/components/MathpixUploader';
import { extractToMmd } from '@/lib/mathpix/client';
import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/lib/database.types';

type SessionInsert = Database['public']['Tables']['sessions']['Insert'];

export default function NewSessionPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [rawMmd, setRawMmd] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    setUploadedFile(file);
    setError(null);
    try {
      const result = await extractToMmd(file);
      setRawMmd(result.rawMmd);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to extract content';
      setError(`Mathpix extraction failed: ${errorMessage}`);
      setUploadedFile(null);
      setRawMmd(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    if (!title.trim()) {
      setError('Session title is required');
      return;
    }

    // If file was uploaded, ensure extraction completed
    if (uploadedFile && !rawMmd) {
      setError('Please wait for file extraction to complete');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare session data
      const sessionData: SessionInsert = {
        title: title.trim(),
        subject: subject.trim() || null,
        raw_mmd: rawMmd || null,
      };

      // Insert session into Supabase
      const { data, error: insertError } = await supabase
        .from('sessions')
        .insert(sessionData)
        .select('id')
        .single();

      if (insertError) {
        throw new Error(`Failed to create session: ${insertError.message}`);
      }

      if (!data) {
        throw new Error('Failed to create session: No data returned');
      }

      // Redirect to the new session
      router.push(`/sessions/${data.id}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create session';
      setError(errorMessage);
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="text-blue-600 hover:text-blue-700 text-sm mb-6 inline-block"
        >
          ← Back to Sessions
        </Link>

        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-6">Create New Session</h1>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Session Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Chemistry Basics"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                Subject (optional)
              </label>
              <input
                type="text"
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Chemistry, Math, Physics"
                disabled={isSubmitting}
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating...' : 'Create Session'}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-4">
              <strong>Optional:</strong> Upload a document to extract content:
            </p>
            <MathpixUploader
              onUploadComplete={(extractedMmd) => {
                setRawMmd(extractedMmd);
                setError(null);
              }}
              onError={(err) => {
                const errorMessage = err instanceof Error ? err.message : 'Upload failed';
                setError(`Mathpix extraction failed: ${errorMessage}`);
                setUploadedFile(null);
                setRawMmd(null);
              }}
            />
            {rawMmd && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  ✓ Content extracted successfully ({rawMmd.length} characters)
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
