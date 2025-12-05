'use client';

import { useState, useEffect } from 'react';
import WordGame from '@/components/WordGame';
import { MmdRenderer } from '@/components/MmdRenderer';
import QuizQuestionCard from './QuizQuestionCard';
import TopicSection from './TopicSection';
import RewriteNotesModal from '@/components/RewriteNotesModal';
import BadQuestionModal from '@/components/BadQuestionModal';
import AddNodeModal from '@/components/AddNodeModal';
import { supabase } from '@/lib/supabaseClient';

type Tab = 'learn' | 'quiz' | 'games';

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

interface QuizQuestion {
  id: string;
  question_text: string;
  options: string[];
  correct_option_index: number;
  explanation: string | null;
  concept_id: string;
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
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
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

  const tabs: { id: Tab; label: string }[] = [
    { id: 'learn', label: 'Learn' },
    { id: 'quiz', label: 'Quiz' },
    { id: 'games', label: 'Games' },
  ];

  // Fetch topics, subtopics, and concepts
  useEffect(() => {
    fetchTopicTree();
    fetchQuizQuestions();
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

  async function fetchQuizQuestions() {
    try {
      const { data } = await supabase
        .from('quiz_questions')
        .select('id, question_text, options, correct_option_index, explanation, concept_id')
        .eq('session_id', sessionId);

      if (data) {
        setQuizQuestions(data.map((q) => ({
          ...q,
          options: q.options as string[],
        })));
      }
    } catch (err) {
      console.error('Error fetching quiz questions:', err);
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
      await Promise.all([fetchTopicTree(), fetchQuizQuestions(), fetchWordGameEntries()]);
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

    // Refresh quiz questions
    await fetchQuizQuestions();
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
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* AI Generation Controls */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">AI Content Generation</h3>
            <p className="text-sm text-blue-700">
              {!hasTopicTree
                ? 'Generate a topic tree from your content, then generate notes, questions, and games.'
                : !hasContent
                  ? 'Topic tree ready! Generate notes, quiz questions, and word game entries.'
                  : 'Content generated! Explore your topics, take quizzes, and play games.'}
            </p>
          </div>
          <div className="flex gap-2">
            {!hasTopicTree && (
              <button
                onClick={handleGenerateTopicTree}
                disabled={isGeneratingTopicTree || !rawMmd}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingTopicTree ? 'Generating...' : 'Generate Topic Tree'}
              </button>
            )}
            {hasTopicTree && !hasContent && (
              <button
                onClick={handleGenerateContent}
                disabled={isGeneratingContent}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingContent ? 'Generating...' : 'Generate Content'}
              </button>
            )}
          </div>
        </div>
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
            {error}
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {activeTab === 'learn' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold mb-4">Learning Mode</h2>
            {!hasTopicTree ? (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">
                  No topic tree yet. Click "Generate Topic Tree" above to get started.
                </p>
                {rawMmd && rawMmd.trim().length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-semibold mb-2">Raw Content Preview:</h3>
                    <div className="max-h-96 overflow-y-auto border rounded p-4">
                      <MmdRenderer content={rawMmd} />
                    </div>
                  </div>
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
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    + Add Topic
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'quiz' && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Quiz Mode</h2>
            {quizQuestions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">
                  No quiz questions yet. Generate content to create quiz questions.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {quizQuestions.map((question, index) => (
                  <div key={question.id} className="relative">
                    <QuizQuestionCard question={question} index={index} />
                    <button
                      onClick={() => setBadQuestionId(question.id)}
                      className="absolute top-4 right-4 text-xs px-2 py-1 text-red-600 hover:text-red-700 border border-red-300 rounded"
                      title="Flag as bad question"
                    >
                      🚩 Bad Question
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'games' && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Wordle-Style Vocab Game</h2>
            {wordGameEntries.length === 0 ? (
              <div className="text-center py-12">
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
                            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() =>
                              setCurrentWordGameIndex((prev) =>
                                prev < wordGameEntries.length - 1 ? prev + 1 : 0
                              )
                            }
                            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                          >
                            Next
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
        questionText={
          quizQuestions.find((q) => q.id === badQuestionId)?.question_text || ''
        }
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

