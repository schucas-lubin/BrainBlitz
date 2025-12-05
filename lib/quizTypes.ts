/**
 * Quiz Types and Interfaces
 * 
 * Type definitions for the quiz experience including configuration,
 * state management, and question handling.
 */

import type { MasteryLevel } from './constants';

// ============================================================================
// Quiz Configuration Types
// ============================================================================

/**
 * Quiz selection mode determining how questions are chosen
 */
export type QuizMode = 'normal' | 'targetWeakness' | 'suggestedTopics';

/**
 * Available question count options
 */
export type QuestionCount = 10 | 25 | 50;

/**
 * Quiz configuration set during setup
 */
export interface QuizConfig {
  /** Which topics to include (empty = all) */
  selectedTopicIds: string[];
  /** Number of questions desired */
  questionCount: QuestionCount;
  /** Selection mode */
  mode: QuizMode;
  /** Enable Active Recall (re-queue incorrect answers) */
  activeRecall: boolean;
}

/**
 * Default quiz configuration
 */
export const DEFAULT_QUIZ_CONFIG: QuizConfig = {
  selectedTopicIds: [],
  questionCount: 10,
  mode: 'normal',
  activeRecall: false,
};

// ============================================================================
// Quiz State Machine Types
// ============================================================================

/**
 * Quiz tab state machine modes
 */
export type QuizTabMode = 'setup' | 'running' | 'summary';

// ============================================================================
// Question Types (extended from DB)
// ============================================================================

/**
 * Quiz question with additional metadata for runtime
 */
export interface QuizQuestionWithMeta {
  id: string;
  question_text: string;
  options: string[];
  correct_option_index: number;
  explanation: string | null;
  concept_id: string;
  topic_id: string;
  subtopic_id: string | null;
  /** Concept name for display */
  conceptName: string;
  /** Topic name for display */
  topicName: string;
  /** Subtopic name if exists */
  subtopicName: string | null;
  /** Current mastery level of the concept */
  masteryLevel: MasteryLevel;
  /** Streak correct for the concept */
  streakCorrect: number;
  /** Streak incorrect for the concept */
  streakIncorrect: number;
}

/**
 * Question in the quiz queue with appearance tracking
 */
export interface QueuedQuestion extends QuizQuestionWithMeta {
  /** Number of times this question has appeared in current quiz */
  appearanceCount: number;
  /** Maximum appearances allowed (for Active Recall) */
  maxAppearances: number;
}

// ============================================================================
// Answer Tracking Types
// ============================================================================

/**
 * Record of a single answer attempt
 */
export interface AnswerRecord {
  questionId: string;
  conceptId: string;
  selectedOptionIndex: number;
  isCorrect: boolean;
  timestamp: number;
  /** Appearance number (1st time, 2nd time, etc.) */
  appearanceNumber: number;
}

/**
 * Result for a concept after the quiz
 */
export interface ConceptResult {
  conceptId: string;
  conceptName: string;
  topicName: string;
  /** Mastery before quiz */
  masteryBefore: MasteryLevel;
  /** Mastery after quiz */
  masteryAfter: MasteryLevel;
  /** Whether mastery improved */
  improved: boolean;
  /** Whether mastery decreased */
  decreased: boolean;
  /** Total attempts for this concept */
  attempts: number;
  /** Correct attempts */
  correctAttempts: number;
}

// ============================================================================
// Quiz Runtime State
// ============================================================================

/**
 * Snapshot of mastery state before quiz for comparison
 */
export interface MasterySnapshot {
  [conceptId: string]: {
    level: MasteryLevel;
    streakCorrect: number;
    streakIncorrect: number;
  };
}

/**
 * Complete quiz runtime state
 */
export interface QuizRuntimeState {
  /** The queue of questions to answer */
  questionQueue: QueuedQuestion[];
  /** Index of current question in the queue */
  currentIndex: number;
  /** All answer records */
  answers: AnswerRecord[];
  /** Mastery snapshot at quiz start */
  masterySnapshot: MasterySnapshot;
  /** Whether the quiz has started */
  started: boolean;
  /** Whether the quiz is complete */
  complete: boolean;
  /** Total questions in original queue (before any additions) */
  originalQuestionCount: number;
}

/**
 * Initial runtime state
 */
export const INITIAL_RUNTIME_STATE: QuizRuntimeState = {
  questionQueue: [],
  currentIndex: 0,
  answers: [],
  masterySnapshot: {},
  started: false,
  complete: false,
  originalQuestionCount: 0,
};

// ============================================================================
// Quiz Summary Types
// ============================================================================

/**
 * Summary statistics for the quiz
 */
export interface QuizSummary {
  /** Total unique questions answered */
  totalQuestions: number;
  /** Total attempts (may be higher than questions if Active Recall) */
  totalAttempts: number;
  /** Correct attempts on first try */
  correctFirstTry: number;
  /** Correct attempts total */
  correctTotal: number;
  /** Percentage score (first try) */
  scorePercent: number;
  /** Concepts that improved */
  conceptsImproved: ConceptResult[];
  /** Concepts that stayed same */
  conceptsUnchanged: ConceptResult[];
  /** Concepts that decreased */
  conceptsDecreased: ConceptResult[];
  /** Concepts still in weak tiers (Cooked or Meh) */
  conceptsStillWeak: ConceptResult[];
}

// ============================================================================
// Topic Selection Types
// ============================================================================

/**
 * Topic with computed mastery for selection UI
 */
export interface TopicForSelection {
  id: string;
  name: string;
  /** Number of questions available */
  questionCount: number;
  /** Number of concepts */
  conceptCount: number;
  /** Average mastery weight (lower = weaker) */
  averageMasteryWeight: number;
  /** Distribution of mastery levels */
  masteryDistribution: Record<MasteryLevel, number>;
}

// ============================================================================
// Helper Constants
// ============================================================================

/**
 * Maximum times a question can appear in a single quiz (for Active Recall)
 */
export const MAX_QUESTION_APPEARANCES = 3;

/**
 * Mastery level display info
 */
export const MASTERY_DISPLAY: Record<MasteryLevel, { 
  label: string; 
  color: string; 
  bgColor: string;
  emoji: string;
}> = {
  'Cooked': { 
    label: 'Cooked', 
    color: 'text-red-700', 
    bgColor: 'bg-red-100',
    emoji: '🔥'
  },
  'Meh': { 
    label: 'Meh', 
    color: 'text-orange-700', 
    bgColor: 'bg-orange-100',
    emoji: '😐'
  },
  "There's Hope": { 
    label: "There's Hope", 
    color: 'text-yellow-700', 
    bgColor: 'bg-yellow-100',
    emoji: '🌟'
  },
  'Locked in': { 
    label: 'Locked In', 
    color: 'text-green-700', 
    bgColor: 'bg-green-100',
    emoji: '🔒'
  },
};

/**
 * Quiz mode display info
 */
export const QUIZ_MODE_INFO: Record<QuizMode, {
  label: string;
  description: string;
  icon: string;
}> = {
  'normal': {
    label: 'Normal',
    description: 'Random selection from all eligible questions',
    icon: '🎲',
  },
  'targetWeakness': {
    label: 'Target Weaknesses',
    description: 'Focus on concepts with lowest mastery levels',
    icon: '🎯',
  },
  'suggestedTopics': {
    label: 'Suggested Topics',
    description: 'Focus on topics that need the most work',
    icon: '📚',
  },
};

