'use client';

import { useState } from 'react';

type NodeType = 'topic' | 'subtopic' | 'concept';

interface AddNodeModalProps {
  isOpen: boolean;
  nodeType: NodeType;
  parentTopicId?: string;
  parentSubtopicId?: string;
  onClose: () => void;
  onConfirm: (name: string) => Promise<void>;
}

export default function AddNodeModal({
  isOpen,
  nodeType,
  parentTopicId,
  parentSubtopicId,
  onClose,
  onConfirm,
}: AddNodeModalProps) {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit() {
    if (name.trim() === '') {
      alert('Please enter a name.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(name.trim());
      onClose();
      setName('');
    } catch (error) {
      console.error('Error adding node:', error);
      alert('Failed to add. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const nodeTypeLabel = nodeType.charAt(0).toUpperCase() + nodeType.slice(1);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-semibold mb-4">Add {nodeTypeLabel}</h2>

        <label className="block mb-4">
          <span className="text-sm text-gray-700 mb-1 block">{nodeTypeLabel} Name:</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
              if (e.key === 'Escape') onClose();
            }}
            className="w-full px-3 py-2 border rounded"
            placeholder={`Enter ${nodeType} name...`}
            autoFocus
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
            disabled={isSubmitting || name.trim() === ''}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}

