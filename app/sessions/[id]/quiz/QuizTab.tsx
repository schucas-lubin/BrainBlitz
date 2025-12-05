'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { updateMastery, type MasteryState } from '@/lib/mastery';
import {
  selectQuestions,
  computeTopicsForSelection,
  computeQuizSummary,
  requeueQuestionForActiveRecall,
  type RawQuizQuestion,
  type ConceptWithDetails,
  type TopicData,
  type SubtopicData,
} from '@/lib/quizEngine';
import type {
  QuizConfig,
  QuizTabMode,
  QuizRuntimeState,
  QueuedQuestion,
  AnswerRecord,
  QuizSummary as QuizSummaryType,
  TopicForSelection,
  MasterySnapshot,
} from '@/lib/quizTypes';
import { INITIAL_RUNTIME_STATE } from '@/lib/quizTypes';
import type { MasteryLevel } from '@/lib/constants';

import QuizSetup from './QuizSetup';
import QuizRunner from './QuizRunner';
import QuizSummary from './QuizSummary';

interface QuizTabProps {
  sessionId: string;
  onBadQuestion: (questionId: string) => void;
  refreshQuestions: () => Promise<void>;
}

export default function QuizTab({
  sessionId,
  onBadQuestion,
  refreshQuestions,
}: QuizTabProps) {
  // State machine mode
  const [mode, setMode] = useState<QuizTabMode>('setup');

  // Data from database
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [subtopics, setSubtopics] = useState<SubtopicData[]>([]);
  const [concepts, setConcepts] = useState<ConceptWithDetails[]>([]);
  const [questions, setQuestions] = useState<RawQuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreparingQuiz, setIsPreparingQuiz] = useState(false);

  // Quiz runtime state
  const [runtimeState, setRuntimeState] = useState<QuizRuntimeState>(
    INITIAL_RUNTIME_STATE
  );
  const [quizConfig, setQuizConfig] = useState<QuizConfig | null>(null);

  // Computed data for setup
  const topicsForSelection = useMemo(() => {
    return computeTopicsForSelection(topics, concepts, questions);
  }, [topics, concepts, questions]);

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all data in parallel
      const [topicsResult, subtopicsResult, conceptsResult, questionsResult] =
        await Promise.all([
          supabase
            .from('topics')
            .select('id, name')
            .eq('session_id', sessionId),
          supabase
            .from('subtopics')
            .select('id, name, topic_id')
            .eq('session_id', sessionId),
          supabase
            .from('concepts')
            .select(
              'id, name, mastery_level, streak_correct, streak_incorrect, topic_id, subtopic_id'
            )
            .eq('session_id', sessionId),
          supabase
            .from('quiz_questions')
            .select(
              'id, question_text, options, correct_option_index, explanation, concept_id, topic_id, subtopic_id'
            )
            .eq('session_id', sessionId),
        ]);

      if (topicsResult.data) setTopics(topicsResult.data);
      if (subtopicsResult.data) setSubtopics(subtopicsResult.data);
      if (conceptsResult.data) {
        setConcepts(
          conceptsResult.data.map((c) => ({
            ...c,
            mastery_level: c.mastery_level as MasteryLevel,
          }))
        );
      }
      if (questionsResult.data) {
        setQuestions(
          questionsResult.data.map((q) => ({
            ...q,
            options: q.options as string[],
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching quiz data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ============================================================================
  // Quiz Actions
  // ============================================================================

  const handleStartQuiz = useCallback(
    async (config: QuizConfig) => {
      setIsPreparingQuiz(true);
      setQuizConfig(config);

      try {
        // Select questions based on config
        const result = selectQuestions({
          questions,
          concepts,
          topics,
          subtopics,
          selectedTopicIds: config.selectedTopicIds,
          mode: config.mode,
          numQuestions: config.questionCount,
        });

        if (result.questions.length === 0) {
          alert('No questions available for the selected configuration.');
          setIsPreparingQuiz(false);
          return;
        }

        // Initialize runtime state
        setRuntimeState({
          questionQueue: result.questions,
          currentIndex: 0,
          answers: [],
          masterySnapshot: result.masterySnapshot,
          started: true,
          complete: false,
          originalQuestionCount: result.effectiveCount,
        });

        setMode('running');
      } catch (error) {
        console.error('Error preparing quiz:', error);
        alert('Failed to prepare quiz. Please try again.');
      } finally {
        setIsPreparingQuiz(false);
      }
    },
    [questions, concepts, topics, subtopics]
  );

  const handleAnswer = useCallback(
    async (
      questionId: string,
      conceptId: string,
      selectedIndex: number,
      isCorrect: boolean
    ) => {
      const currentQuestion = runtimeState.questionQueue[runtimeState.currentIndex];

      // Record the answer
      const answerRecord: AnswerRecord = {
        questionId,
        conceptId,
        selectedOptionIndex: selectedIndex,
        isCorrect,
        timestamp: Date.now(),
        appearanceNumber: currentQuestion.appearanceCount + 1,
      };

      setRuntimeState((prev) => ({
        ...prev,
        answers: [...prev.answers, answerRecord],
      }));

      // Update mastery in database
      const concept = concepts.find((c) => c.id === conceptId);
      if (concept) {
        const currentMastery: MasteryState = {
          level: concept.mastery_level,
          streakCorrect: concept.streak_correct,
          streakIncorrect: concept.streak_incorrect,
        };

        const newMastery = updateMastery(currentMastery, isCorrect);

        // Update in database
        await supabase
          .from('concepts')
          .update({
            mastery_level: newMastery.level,
            streak_correct: newMastery.streakCorrect,
            streak_incorrect: newMastery.streakIncorrect,
            updated_at: new Date().toISOString(),
          })
          .eq('id', conceptId);

        // Update local concepts state
        setConcepts((prev) =>
          prev.map((c) =>
            c.id === conceptId
              ? {
                  ...c,
                  mastery_level: newMastery.level,
                  streak_correct: newMastery.streakCorrect,
                  streak_incorrect: newMastery.streakIncorrect,
                }
              : c
          )
        );

        // Update the question in queue with new mastery
        setRuntimeState((prev) => ({
          ...prev,
          questionQueue: prev.questionQueue.map((q, i) =>
            i === prev.currentIndex
              ? { ...q, masteryLevel: newMastery.level }
              : q
          ),
        }));
      }
    },
    [runtimeState.currentIndex, runtimeState.questionQueue, concepts]
  );

  const handleNext = useCallback(() => {
    setRuntimeState((prev) => {
      const nextIndex = prev.currentIndex + 1;
      if (nextIndex >= prev.questionQueue.length) {
        return { ...prev, complete: true };
      }
      return { ...prev, currentIndex: nextIndex };
    });
  }, []);

  const handleRequeueForRecall = useCallback(() => {
    setRuntimeState((prev) => {
      const newQueue = requeueQuestionForActiveRecall(
        prev.questionQueue,
        prev.currentIndex
      );
      if (newQueue) {
        return { ...prev, questionQueue: newQueue };
      }
      return prev;
    });
  }, []);

  const handleStopQuiz = useCallback(() => {
    setRuntimeState((prev) => ({ ...prev, complete: true }));
    setMode('summary');
  }, []);

  // Transition to summary when complete
  useEffect(() => {
    if (runtimeState.complete && mode === 'running') {
      setMode('summary');
    }
  }, [runtimeState.complete, mode]);

  const handleReturnToSetup = useCallback(() => {
    setRuntimeState(INITIAL_RUNTIME_STATE);
    setQuizConfig(null);
    setMode('setup');
    fetchData(); // Refresh data
  }, [fetchData]);

  const handleBackToSession = useCallback(() => {
    // This would typically be handled by the parent component
    // For now, just return to setup
    handleReturnToSetup();
  }, [handleReturnToSetup]);

  // ============================================================================
  // Compute Summary
  // ============================================================================

  const quizSummary = useMemo((): QuizSummaryType | null => {
    if (mode !== 'summary' || runtimeState.answers.length === 0) {
      return null;
    }

    // Build current mastery map
    const currentMastery = new Map<
      string,
      { level: MasteryLevel; conceptName: string; topicName: string }
    >();

    for (const concept of concepts) {
      const topic = topics.find((t) => t.id === concept.topic_id);
      currentMastery.set(concept.id, {
        level: concept.mastery_level,
        conceptName: concept.name,
        topicName: topic?.name || 'Unknown',
      });
    }

    return computeQuizSummary(
      runtimeState.answers,
      runtimeState.masterySnapshot,
      currentMastery
    );
  }, [mode, runtimeState.answers, runtimeState.masterySnapshot, concepts, topics]);

  // ============================================================================
  // Render
  // ============================================================================

  if (isLoading) {
    return <QuizLoadingSkeleton />;
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-16 animate-fadeIn">
        <div className="text-5xl mb-4">📝</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No Quiz Questions Yet
        </h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Generate content for your session to create quiz questions. Once you
          have questions, you can take quizzes to test your knowledge!
        </p>
      </div>
    );
  }

  return (
    <div>
      {mode === 'setup' && (
        <QuizSetup
          topics={topicsForSelection}
          totalQuestionCount={questions.length}
          onStartQuiz={handleStartQuiz}
          isLoading={isPreparingQuiz}
        />
      )}

      {mode === 'running' && runtimeState.questionQueue.length > 0 && (
        <QuizRunner
          questions={runtimeState.questionQueue}
          currentIndex={runtimeState.currentIndex}
          totalQuestions={runtimeState.originalQuestionCount}
          activeRecall={quizConfig?.activeRecall || false}
          onAnswer={handleAnswer}
          onNext={handleNext}
          onRequeueForRecall={handleRequeueForRecall}
          onStopQuiz={handleStopQuiz}
          onBadQuestion={onBadQuestion}
        />
      )}

      {mode === 'summary' && quizSummary && (
        <QuizSummary
          summary={quizSummary}
          onReturnToSetup={handleReturnToSetup}
          onBackToSession={handleBackToSession}
        />
      )}
    </div>
  );
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function QuizLoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-8">
        <div className="skeleton h-8 w-48 mb-2" />
        <div className="skeleton h-4 w-72" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="quiz-card p-6">
          <div className="skeleton h-6 w-32 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-16 w-full rounded-lg" />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="quiz-card p-6">
            <div className="skeleton h-6 w-40 mb-4" />
            <div className="flex gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-12 flex-1 rounded-full" />
              ))}
            </div>
          </div>

          <div className="quiz-card p-6">
            <div className="skeleton h-6 w-32 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-20 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

