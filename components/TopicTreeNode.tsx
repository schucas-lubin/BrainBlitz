'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { MmdRenderer } from './MmdRenderer';

interface Concept {
  id: string;
  name: string;
  order_index: number;
  generated_notes_mmd: string | null;
  needs_research: boolean;
  subtopic_id: string | null;
}

interface TopicTreeNodeProps {
  concept: Concept;
  onUpdate: () => void;
  onRewriteNotes: (conceptId: string) => void;
}

export default function TopicTreeNode({ concept, onUpdate, onRewriteNotes }: TopicTreeNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(concept.name);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingResearch, setIsTogglingResearch] = useState(false);

  async function handleSaveName() {
    if (editName.trim() === '') return;

    const { error } = await supabase
      .from('concepts')
      .update({ name: editName.trim() })
      .eq('id', concept.id);

    if (error) {
      console.error('Error updating concept name:', error);
      alert('Failed to update concept name');
    } else {
      setIsEditing(false);
      onUpdate();
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete concept "${concept.name}"? This will also delete all associated quiz questions and word game entries.`)) {
      return;
    }

    setIsDeleting(true);
    const { error } = await supabase
      .from('concepts')
      .delete()
      .eq('id', concept.id);

    if (error) {
      console.error('Error deleting concept:', error);
      alert('Failed to delete concept');
      setIsDeleting(false);
    } else {
      onUpdate();
    }
  }

  async function handleToggleResearch() {
    setIsTogglingResearch(true);
    const { error } = await supabase
      .from('concepts')
      .update({ needs_research: !concept.needs_research })
      .eq('id', concept.id);

    if (error) {
      console.error('Error toggling research flag:', error);
      alert('Failed to update research flag');
      setIsTogglingResearch(false);
    } else {
      onUpdate();
    }
  }

  return (
    <div className="border-l-2 border-gray-200 pl-4">
      <div className="flex items-center gap-2 mb-2">
        {isEditing ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName();
                if (e.key === 'Escape') {
                  setIsEditing(false);
                  setEditName(concept.name);
                }
              }}
              className="flex-1 px-2 py-1 border rounded text-sm"
              autoFocus
            />
            <button
              onClick={handleSaveName}
              className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
            >
              Save
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditName(concept.name);
              }}
              className="px-2 py-1 text-xs bg-gray-300 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <h5 className="font-medium flex-1">{concept.name}</h5>
            <div className="flex items-center gap-2">
              {concept.needs_research && (
                <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                  Research
                </span>
              )}
              <button
                onClick={handleToggleResearch}
                disabled={isTogglingResearch}
                className={`text-lg ${concept.needs_research ? 'text-yellow-500' : 'text-gray-400'} hover:text-yellow-600 disabled:opacity-50`}
                title={concept.needs_research ? 'Remove research flag' : 'Mark for research'}
              >
                {concept.needs_research ? '★' : '☆'}
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs px-2 py-1 text-blue-600 hover:text-blue-700"
                title="Edit name"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-xs px-2 py-1 text-red-600 hover:text-red-700 disabled:opacity-50"
                title="Delete concept"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </>
        )}
      </div>
      {concept.generated_notes_mmd ? (
        <div className="text-sm text-gray-700 mb-2">
          <MmdRenderer content={concept.generated_notes_mmd} />
          <button
            onClick={() => onRewriteNotes(concept.id)}
            className="mt-2 text-xs px-2 py-1 text-blue-600 hover:text-blue-700 border border-blue-300 rounded"
          >
            Rewrite Notes
          </button>
        </div>
      ) : (
        <p className="text-sm text-gray-500 italic mb-2">No notes generated yet.</p>
      )}
    </div>
  );
}

