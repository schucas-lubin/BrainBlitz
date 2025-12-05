'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import TopicTreeNode from '@/components/TopicTreeNode';
import { MmdRenderer } from '@/components/MmdRenderer';

interface Concept {
  id: string;
  name: string;
  order_index: number;
  generated_notes_mmd: string | null;
  needs_research: boolean;
  subtopic_id: string | null;
}

interface Subtopic {
  id: string;
  name: string;
  order_index: number;
  concepts: Concept[];
}

interface Topic {
  id: string;
  name: string;
  order_index: number;
  subtopics: Subtopic[];
  orphanConcepts?: Concept[];
}

interface TopicSectionProps {
  topic: Topic;
  sessionId: string;
  onUpdate: () => void;
  onRewriteNotes: (conceptId: string) => void;
  onAddNode: (type: 'subtopic' | 'concept', parentTopicId: string, parentSubtopicId?: string) => void;
}

export default function TopicSection({
  topic,
  sessionId,
  onUpdate,
  onRewriteNotes,
  onAddNode,
}: TopicSectionProps) {
  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const [editTopicName, setEditTopicName] = useState(topic.name);
  const [isDeletingTopic, setIsDeletingTopic] = useState(false);

  async function handleSaveTopicName() {
    if (editTopicName.trim() === '') return;

    const { error } = await supabase
      .from('topics')
      .update({ name: editTopicName.trim() })
      .eq('id', topic.id);

    if (error) {
      console.error('Error updating topic name:', error);
      alert('Failed to update topic name');
    } else {
      setIsEditingTopic(false);
      onUpdate();
    }
  }

  async function handleDeleteTopic() {
    if (
      !confirm(
        `Delete topic "${topic.name}"? This will also delete all subtopics, concepts, quiz questions, and word game entries.`
      )
    ) {
      return;
    }

    setIsDeletingTopic(true);
    const { error } = await supabase.from('topics').delete().eq('id', topic.id);

    if (error) {
      console.error('Error deleting topic:', error);
      alert('Failed to delete topic');
      setIsDeletingTopic(false);
    } else {
      onUpdate();
    }
  }

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        {isEditingTopic ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              value={editTopicName}
              onChange={(e) => setEditTopicName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTopicName();
                if (e.key === 'Escape') {
                  setIsEditingTopic(false);
                  setEditTopicName(topic.name);
                }
              }}
              className="flex-1 px-2 py-1 border rounded text-lg font-semibold"
              autoFocus
            />
            <button
              onClick={handleSaveTopicName}
              className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
            >
              Save
            </button>
            <button
              onClick={() => {
                setIsEditingTopic(false);
                setEditTopicName(topic.name);
              }}
              className="px-2 py-1 text-xs bg-gray-300 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-xl font-semibold">{topic.name}</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditingTopic(true)}
                className="text-xs px-2 py-1 text-blue-600 hover:text-blue-700"
                title="Edit name"
              >
                Edit
              </button>
              <button
                onClick={handleDeleteTopic}
                disabled={isDeletingTopic}
                className="text-xs px-2 py-1 text-red-600 hover:text-red-700 disabled:opacity-50"
                title="Delete topic"
              >
                {isDeletingTopic ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </>
        )}
      </div>

      {topic.subtopics.map((subtopic) => (
        <SubtopicSection
          key={subtopic.id}
          subtopic={subtopic}
          topicId={topic.id}
          sessionId={sessionId}
          onUpdate={onUpdate}
          onRewriteNotes={onRewriteNotes}
          onAddNode={onAddNode}
        />
      ))}

      {topic.orphanConcepts && topic.orphanConcepts.length > 0 && (
        <div className="ml-4 mt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-500">Other Concepts</h4>
            <button
              onClick={() => onAddNode('concept', topic.id)}
              className="text-xs px-2 py-1 text-blue-600 hover:text-blue-700"
            >
              + Add Concept
            </button>
          </div>
          {topic.orphanConcepts.map((concept) => (
            <TopicTreeNode
              key={concept.id}
              concept={concept}
              onUpdate={onUpdate}
              onRewriteNotes={onRewriteNotes}
            />
          ))}
        </div>
      )}

      {topic.subtopics.length === 0 && (!topic.orphanConcepts || topic.orphanConcepts.length === 0) && (
        <div className="ml-4 mt-2">
          <button
            onClick={() => onAddNode('subtopic', topic.id)}
            className="text-xs px-2 py-1 text-blue-600 hover:text-blue-700"
          >
            + Add Subtopic
          </button>
        </div>
      )}
    </div>
  );
}

function SubtopicSection({
  subtopic,
  topicId,
  sessionId,
  onUpdate,
  onRewriteNotes,
  onAddNode,
}: {
  subtopic: Subtopic;
  topicId: string;
  sessionId: string;
  onUpdate: () => void;
  onRewriteNotes: (conceptId: string) => void;
  onAddNode: (type: 'subtopic' | 'concept', parentTopicId: string, parentSubtopicId?: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(subtopic.name);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleSaveName() {
    if (editName.trim() === '') return;

    const { error } = await supabase
      .from('subtopics')
      .update({ name: editName.trim() })
      .eq('id', subtopic.id);

    if (error) {
      console.error('Error updating subtopic name:', error);
      alert('Failed to update subtopic name');
    } else {
      setIsEditing(false);
      onUpdate();
    }
  }

  async function handleDelete() {
    if (
      !confirm(
        `Delete subtopic "${subtopic.name}"? This will also delete all concepts, quiz questions, and word game entries.`
      )
    ) {
      return;
    }

    setIsDeleting(true);
    const { error } = await supabase.from('subtopics').delete().eq('id', subtopic.id);

    if (error) {
      console.error('Error deleting subtopic:', error);
      alert('Failed to delete subtopic');
      setIsDeleting(false);
    } else {
      onUpdate();
    }
  }

  return (
    <div className="ml-4 mb-4">
      <div className="flex items-center justify-between mb-2">
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
                  setEditName(subtopic.name);
                }
              }}
              className="flex-1 px-2 py-1 border rounded text-lg font-medium"
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
                setEditName(subtopic.name);
              }}
              className="px-2 py-1 text-xs bg-gray-300 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <h4 className="text-lg font-medium text-gray-700">{subtopic.name}</h4>
            <div className="flex gap-2">
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
                title="Delete subtopic"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </>
        )}
      </div>
      <div className="ml-4 space-y-3">
        {subtopic.concepts.map((concept) => (
          <TopicTreeNode
            key={concept.id}
            concept={concept}
            onUpdate={onUpdate}
            onRewriteNotes={onRewriteNotes}
          />
        ))}
        <button
          onClick={() => onAddNode('concept', topicId, subtopic.id)}
          className="text-xs px-2 py-1 text-blue-600 hover:text-blue-700"
        >
          + Add Concept
        </button>
      </div>
    </div>
  );
}

