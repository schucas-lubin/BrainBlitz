'use client';

import { useState } from 'react';

interface BadQuestionModalProps {
  isOpen: boolean;
  questionText: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export default function BadQuestionModal({
  isOpen,
  questionText,
  onClose,
  onConfirm,
}: BadQuestionModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit() {
    setIsSubmitting(true);
    try {
      await onConfirm(reason);
      onClose();
      setReason('');
    } catch (error) {
      console.error('Error rewriting question:', error);
      alert('Failed to rewrite question. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-semibold mb-4">Flag Bad Question</h2>
        <p className="text-sm text-gray-600 mb-2">This question will be skipped and replaced with a better one.</p>
        <p className="text-sm font-medium mb-2">Question:</p>
        <p className="text-sm text-gray-800 mb-4 p-2 bg-gray-50 rounded">{questionText}</p>

        <label className="block mb-2">
          <span className="text-sm text-gray-700">Reason (optional):</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., The options feel too similar and confusing..."
            className="w-full mt-1 px-3 py-2 border rounded text-sm"
            rows={3}
          />
        </label>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-700 border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Rewriting...' : 'Flag & Rewrite'}
          </button>
        </div>
      </div>
    </div>
  );
}

