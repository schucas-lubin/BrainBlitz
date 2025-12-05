'use client';

import { useState } from 'react';

interface RewriteNotesModalProps {
  isOpen: boolean;
  conceptName: string;
  onClose: () => void;
  onConfirm: (modifiers: {
    add_detail: boolean;
    make_more_specific: boolean;
    add_examples: boolean;
  }) => Promise<void>;
}

export default function RewriteNotesModal({
  isOpen,
  conceptName,
  onClose,
  onConfirm,
}: RewriteNotesModalProps) {
  const [modifiers, setModifiers] = useState({
    add_detail: false,
    make_more_specific: false,
    add_examples: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit() {
    // At least one modifier must be selected
    if (!modifiers.add_detail && !modifiers.make_more_specific && !modifiers.add_examples) {
      alert('Please select at least one modification option.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(modifiers);
      onClose();
      // Reset modifiers
      setModifiers({
        add_detail: false,
        make_more_specific: false,
        add_examples: false,
      });
    } catch (error) {
      console.error('Error rewriting notes:', error);
      alert('Failed to rewrite notes. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-semibold mb-4">Rewrite Notes</h2>
        <p className="text-sm text-gray-600 mb-4">
          How would you like to improve the notes for <strong>{conceptName}</strong>?
        </p>

        <div className="space-y-3 mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={modifiers.add_detail}
              onChange={(e) =>
                setModifiers({ ...modifiers, add_detail: e.target.checked })
              }
              className="w-4 h-4"
            />
            <span className="text-sm">Add more detail/length</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={modifiers.make_more_specific}
              onChange={(e) =>
                setModifiers({ ...modifiers, make_more_specific: e.target.checked })
              }
              className="w-4 h-4"
            />
            <span className="text-sm">Make more specific to this topic/session</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={modifiers.add_examples}
              onChange={(e) =>
                setModifiers({ ...modifiers, add_examples: e.target.checked })
              }
              className="w-4 h-4"
            />
            <span className="text-sm">Add examples and/or analogies</span>
          </label>
        </div>

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
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Rewriting...' : 'Rewrite Notes'}
          </button>
        </div>
      </div>
    </div>
  );
}

