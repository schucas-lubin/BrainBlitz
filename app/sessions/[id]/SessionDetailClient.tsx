'use client';

import { useState, useEffect, useCallback } from 'react';
import WordGame from '@/components/WordGame';
import MmdSourceViewer from '@/components/MmdSourceViewer';
import TopicSection from './TopicSection';
import RewriteNotesModal from '@/components/RewriteNotesModal';
import BadQuestionModal from '@/components/BadQuestionModal';
import AddNodeModal from '@/components/AddNodeModal';
import QuizTab from './quiz/QuizTab';
import { supabase } from '@/lib/supabaseClient';

type Tab = 'learn' | 'quiz' | 'games' | 'source';

interface SessionDetailClientProps {
  sessionId: string;
  rawMmd: string | null;
}

interface Topic {
  id: string;
  name: string;
  order_index: number;
  subtopics: Subtopic[];
  orphanConcepts?: Concept[];
}

interface Subtopic {
  id: string;
  name: string;
  order_index: number;
  concepts: Concept[];
}

interface Concept {
  id: string;
  name: string;
  order_index: number;
  generated_notes_mmd: string | null;
  needs_research: boolean;
  subtopic_id: string | null;
}

interface WordGameEntry {
  id: string;
  word: string;
  clue: string;
  concept_id: string;
}

export default function SessionDetailClient({ sessionId, rawMmd }: SessionDetailClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('learn');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [wordGameEntries, setWordGameEntries] = useState<WordGameEntry[]>([]);
  const [currentWordGameIndex, setCurrentWordGameIndex] = useState(0);
  const [isGeneratingTopicTree, setIsGeneratingTopicTree] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rewriteNotesConceptId, setRewriteNotesConceptId] = useState<string | null>(null);
  const [badQuestionId, setBadQuestionId] = useState<string | null>(null);
  const [addNodeModal, setAddNodeModal] = useState<{
    isOpen: boolean;
    type: 'topic' | 'subtopic' | 'concept';
    parentTopicId?: string;
    parentSubtopicId?: string;
  }>({ isOpen: false, type: 'topic' });

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'learn', label: 'Learn', icon: '📚' },
    { id: 'quiz', label: 'Quiz', icon: '✏️' },
    { id: 'games', label: 'Games', icon: '🎮' },
    { id: 'source', label: 'Source', icon: '📄' },
  ];

  // Fetch topics, subtopics, and concepts
  useEffect(() => {
    fetchTopicTree();
    fetchWordGameEntries();
  }, [sessionId]);

  async function fetchTopicTree() {
    try {
      // Fetch topics
      const { data: topicsData } = await supabase
        .from('topics')
        .select('id, name, order_index')
        .eq('session_id', sessionId)
        .order('order_index');

      if (!topicsData) return;

      // Fetch subtopics
      const { data: subtopicsData } = await supabase
        .from('subtopics')
        .select('id, name, order_index, topic_id')
        .eq('session_id', sessionId)
        .order('order_index');

      // Fetch concepts
      const { data: conceptsData } = await supabase
        .from('concepts')
        .select('id, name, order_index, generated_notes_mmd, needs_research, subtopic_id, topic_id')
        .eq('session_id', sessionId)
        .order('order_index');

      // Build hierarchical structure
      const topicsWithSubtopic: Topic[] = topicsData.map((topic) => {
        const subtopics = (subtopicsData || [])
          .filter((st) => st.topic_id === topic.id)
          .map((st) => ({
            ...st,
            concepts: (conceptsData || [])
              .filter((c) => c.subtopic_id === st.id)
              .map((c) => ({
                id: c.id,
                name: c.name,
                order_index: c.order_index,
                generated_notes_mmd: c.generated_notes_mmd,
                needs_research: c.needs_research,
                subtopic_id: c.subtopic_id,
              })),
          }));

        // Add orphan concepts (concepts without subtopics)
        const orphanConcepts = (conceptsData || []).filter(
          (c) => c.topic_id === topic.id && c.subtopic_id === null
        );

        return {
          ...topic,
          subtopics: subtopics.length > 0 ? subtopics : [],
          orphanConcepts: orphanConcepts.map((c) => ({
            id: c.id,
            name: c.name,
            order_index: c.order_index,
            generated_notes_mmd: c.generated_notes_mmd,
            needs_research: c.needs_research,
            subtopic_id: null,
          })),
        };
      });

      setTopics(topicsWithSubtopic);
    } catch (err) {
      console.error('Error fetching topic tree:', err);
    }
  }

  async function fetchWordGameEntries() {
    try {
      const { data } = await supabase
        .from('word_game_entries')
        .select('id, word, clue, concept_id')
        .eq('session_id', sessionId)
        .order('order_index');

      if (data) {
        setWordGameEntries(data);
      }
    } catch (err) {
      console.error('Error fetching word game entries:', err);
    }
  }

  // Refresh quiz questions - passed to QuizTab for reloading after bad question
  const refreshQuizQuestions = useCallback(async () => {
    // QuizTab handles its own data fetching, this is just for callback compatibility
  }, []);

  async function handleGenerateTopicTree() {
    if (!rawMmd || rawMmd.trim().length === 0) {
      setError('Session must have extracted content first. Please upload and extract content.');
      return;
    }

    setIsGeneratingTopicTree(true);
    setError(null);

    try {
      const response = await fetch(`/api/ai/sessions/${sessionId}/topic-tree`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate topic tree');
      }

      // Refresh the topic tree
      await fetchTopicTree();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate topic tree');
    } finally {
      setIsGeneratingTopicTree(false);
    }
  }

  async function handleGenerateContent() {
    if (topics.length === 0) {
      setError('Please generate topic tree first.');
      return;
    }

    setIsGeneratingContent(true);
    setError(null);

    try {
      const response = await fetch(`/api/ai/sessions/${sessionId}/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'session',
          overwrite_mode: 'replace',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate content');
      }

      // Refresh all data
      await Promise.all([fetchTopicTree(), fetchWordGameEntries()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate content');
    } finally {
      setIsGeneratingContent(false);
    }
  }

  async function handleRewriteNotes(modifiers: {
    add_detail: boolean;
    make_more_specific: boolean;
    add_examples: boolean;
  }) {
    if (!rewriteNotesConceptId) return;

    const response = await fetch(`/api/ai/concepts/${rewriteNotesConceptId}/rewrite-notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modifiers }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to rewrite notes');
    }

    // Refresh topic tree to show updated notes
    await fetchTopicTree();
  }

  async function handleBadQuestion(reason: string) {
    if (!badQuestionId) return;

    const response = await fetch(`/api/ai/quiz-questions/${badQuestionId}/rewrite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to rewrite question');
    }
  }

  async function handleAddNode(name: string) {
    const { type, parentTopicId, parentSubtopicId } = addNodeModal;

    if (type === 'topic') {
      // Get max order_index for topics
      const { data: existingTopics } = await supabase
        .from('topics')
        .select('order_index')
        .eq('session_id', sessionId)
        .order('order_index', { ascending: false })
        .limit(1);

      const nextOrderIndex = existingTopics && existingTopics.length > 0
        ? existingTopics[0].order_index + 10
        : 10;

      const { error } = await supabase
        .from('topics')
        .insert({
          session_id: sessionId,
          name,
          order_index: nextOrderIndex,
        });

      if (error) throw error;
    } else if (type === 'subtopic' && parentTopicId) {
      // Get max order_index for subtopics in this topic
      const { data: existingSubtopics } = await supabase
        .from('subtopics')
        .select('order_index')
        .eq('topic_id', parentTopicId)
        .order('order_index', { ascending: false })
        .limit(1);

      const nextOrderIndex = existingSubtopics && existingSubtopics.length > 0
        ? existingSubtopics[0].order_index + 10
        : 10;

      const { error } = await supabase
        .from('subtopics')
        .insert({
          session_id: sessionId,
          topic_id: parentTopicId,
          name,
          order_index: nextOrderIndex,
        });

      if (error) throw error;
    } else if (type === 'concept' && parentTopicId) {
      // Get max order_index for concepts
      const query = supabase
        .from('concepts')
        .select('order_index')
        .eq('topic_id', parentTopicId);

      if (parentSubtopicId) {
        query.eq('subtopic_id', parentSubtopicId);
      } else {
        query.is('subtopic_id', null);
      }

      const { data: existingConcepts } = await query
        .order('order_index', { ascending: false })
        .limit(1);

      const nextOrderIndex = existingConcepts && existingConcepts.length > 0
        ? existingConcepts[0].order_index + 10
        : 10;

      const { error } = await supabase
        .from('concepts')
        .insert({
          session_id: sessionId,
          topic_id: parentTopicId,
          subtopic_id: parentSubtopicId || null,
          name,
          order_index: nextOrderIndex,
          needs_research: false,
        });

      if (error) throw error;
    }

    await fetchTopicTree();
  }

  const hasTopicTree = topics.length > 0;
  const hasContent = topics.some((t) =>
    t.subtopics.some((st) => st.concepts.some((c) => c.generated_notes_mmd))
  );

  return (
    <div className="max-w-6xl mx-auto px-8 py-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-sm transition-all duration-200
                ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* AI Generation Controls */}
      <div className="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-indigo-900 mb-1 flex items-center gap-2">
              <span>✨</span>
              AI Content Generation
            </h3>
            <p className="text-sm text-indigo-700">
              {!hasTopicTree
                ? 'Generate a topic tree from your content, then generate notes, questions, and games.'
                : !hasContent
                  ? 'Topic tree ready! Generate notes, quiz questions, and word game entries.'
                  : 'Content generated! Explore your topics, take quizzes, and play games.'}
            </p>
          </div>
          <div className="flex gap-3">
            {!hasTopicTree && (
              <button
                onClick={handleGenerateTopicTree}
                disabled={isGeneratingTopicTree || !rawMmd}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium
                           hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-200 shadow-sm hover:shadow"
              >
                {isGeneratingTopicTree ? (
                  <span className="flex items-center gap-2">
                    <LoadingSpinner />
                    Generating...
                  </span>
                ) : (
                  'Generate Topic Tree'
                )}
              </button>
            )}
            {hasTopicTree && !hasContent && (
              <button
                onClick={handleGenerateContent}
                disabled={isGeneratingContent}
                className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg font-medium
                           hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-200 shadow-sm hover:shadow"
              >
                {isGeneratingContent ? (
                  <span className="flex items-center gap-2">
                    <LoadingSpinner />
                    Generating...
                  </span>
                ) : (
                  'Generate Content'
                )}
              </button>
            )}
          </div>
        </div>
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {error}
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {activeTab === 'learn' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Learning Mode</h2>
            {!hasTopicTree ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">📖</div>
                <p className="text-gray-600 mb-4">
                  No topic tree yet. Click &quot;Generate Topic Tree&quot; above to get started.
                </p>
                {rawMmd && rawMmd.trim().length > 0 && (
                  <p className="text-sm text-gray-500">
                    Tip: Check the &quot;Source&quot; tab to view your extracted content.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {topics.map((topic) => (
                  <TopicSection
                    key={topic.id}
                    topic={topic}
                    sessionId={sessionId}
                    onUpdate={fetchTopicTree}
                    onRewriteNotes={setRewriteNotesConceptId}
                    onAddNode={(type, parentTopicId, parentSubtopicId) =>
                      setAddNodeModal({
                        isOpen: true,
                        type,
                        parentTopicId,
                        parentSubtopicId,
                      })
                    }
                  />
                ))}
                <div className="mt-4">
                  <button
                    onClick={() =>
                      setAddNodeModal({ isOpen: true, type: 'topic' })
                    }
                    className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    + Add Topic
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'quiz' && (
          <QuizTab
            sessionId={sessionId}
            onBadQuestion={(questionId) => setBadQuestionId(questionId)}
            refreshQuestions={refreshQuizQuestions}
          />
        )}

        {activeTab === 'games' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Wordle-Style Vocab Game</h2>
            {wordGameEntries.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">🎮</div>
                <p className="text-gray-600 mb-4">
                  No word game entries yet. Generate content to create word games.
                </p>
              </div>
            ) : (
              <div>
                {wordGameEntries[currentWordGameIndex] && (
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-sm text-gray-600">
                        Game {currentWordGameIndex + 1} of {wordGameEntries.length}
                      </p>
                      {wordGameEntries.length > 1 && (
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              setCurrentWordGameIndex((prev) =>
                                prev > 0 ? prev - 1 : wordGameEntries.length - 1
                              )
                            }
                            className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            ← Previous
                          </button>
                          <button
                            onClick={() =>
                              setCurrentWordGameIndex((prev) =>
                                prev < wordGameEntries.length - 1 ? prev + 1 : 0
                              )
                            }
                            className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            Next →
                          </button>
                        </div>
                      )}
                    </div>
                    <WordGame
                      word={wordGameEntries[currentWordGameIndex].word}
                      clue={wordGameEntries[currentWordGameIndex].clue}
                      onComplete={(success, guesses) => {
                        console.log(
                          `Game completed: ${success ? 'success' : 'failure'} in ${guesses} guesses`
                        );
                        // Move to next game after a delay
                        setTimeout(() => {
                          if (currentWordGameIndex < wordGameEntries.length - 1) {
                            setCurrentWordGameIndex((prev) => prev + 1);
                          }
                        }, 2000);
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'source' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Source Document</h2>
            <p className="text-gray-600 mb-6">
              This is the full extracted content from your uploaded document, rendered with Mathpix Markdown.
            </p>
            <div className="border border-gray-200 rounded-lg p-6 bg-white max-h-[70vh] overflow-y-auto">
              <MmdSourceViewer content={rawMmd} />
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <RewriteNotesModal
        isOpen={rewriteNotesConceptId !== null}
        conceptName={
          topics
            .flatMap((t) => [
              ...t.subtopics.flatMap((st) => st.concepts),
              ...(t.orphanConcepts || []),
            ])
            .find((c) => c.id === rewriteNotesConceptId)?.name || ''
        }
        onClose={() => setRewriteNotesConceptId(null)}
        onConfirm={handleRewriteNotes}
      />

      <BadQuestionModal
        isOpen={badQuestionId !== null}
        questionText="This question will be rewritten"
        onClose={() => setBadQuestionId(null)}
        onConfirm={handleBadQuestion}
      />

      <AddNodeModal
        isOpen={addNodeModal.isOpen}
        nodeType={addNodeModal.type}
        parentTopicId={addNodeModal.parentTopicId}
        parentSubtopicId={addNodeModal.parentSubtopicId}
        onClose={() => setAddNodeModal({ isOpen: false, type: 'topic' })}
        onConfirm={handleAddNode}
      />
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
