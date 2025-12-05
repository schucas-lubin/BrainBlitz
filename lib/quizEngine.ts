/**
 * Quiz Engine - Question Selection and Randomization
 * 
 * Pure functions for selecting quiz questions based on configuration,
 * mastery data, and selection modes. No React dependencies.
 */

import type { MasteryLevel } from './constants';
import { MASTERY_WEIGHTS } from './constants';
import type {
  QuizMode,
  QuizQuestionWithMeta,
  QueuedQuestion,
  TopicForSelection,
  MasterySnapshot,
  QuizSummary,
  AnswerRecord,
  ConceptResult,
  MAX_QUESTION_APPEARANCES,
} from './quizTypes';

// ============================================================================
// Types for Engine Input
// ============================================================================

/**
 * Raw question data from database
 */
export interface RawQuizQuestion {
  id: string;
  question_text: string;
  options: string[];
  correct_option_index: number;
  explanation: string | null;
  concept_id: string;
  topic_id: string;
  subtopic_id: string | null;
}

/**
 * Concept data with mastery info
 */
export interface ConceptWithDetails {
  id: string;
  name: string;
  mastery_level: MasteryLevel;
  streak_correct: number;
  streak_incorrect: number;
  topic_id: string;
  subtopic_id: string | null;
}

/**
 * Topic data
 */
export interface TopicData {
  id: string;
  name: string;
}

/**
 * Subtopic data
 */
export interface SubtopicData {
  id: string;
  name: string;
  topic_id: string;
}

// ============================================================================
// Fisher-Yates Shuffle
// ============================================================================

/**
 * Shuffles an array in place using Fisher-Yates algorithm
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============================================================================
// Topic Analysis
// ============================================================================

/**
 * Compute topic selection data with mastery analysis
 */
export function computeTopicsForSelection(
  topics: TopicData[],
  concepts: ConceptWithDetails[],
  questions: RawQuizQuestion[]
): TopicForSelection[] {
  return topics.map((topic) => {
    const topicConcepts = concepts.filter((c) => c.topic_id === topic.id);
    const topicQuestions = questions.filter((q) => q.topic_id === topic.id);

    // Calculate mastery distribution
    const masteryDistribution: Record<MasteryLevel, number> = {
      'Cooked': 0,
      'Meh': 0,
      "There's Hope": 0,
      'Locked in': 0,
    };

    let totalWeight = 0;
    for (const concept of topicConcepts) {
      masteryDistribution[concept.mastery_level]++;
      totalWeight += MASTERY_WEIGHTS[concept.mastery_level];
    }

    const averageMasteryWeight =
      topicConcepts.length > 0 ? totalWeight / topicConcepts.length : 0;

    return {
      id: topic.id,
      name: topic.name,
      questionCount: topicQuestions.length,
      conceptCount: topicConcepts.length,
      averageMasteryWeight,
      masteryDistribution,
    };
  });
}

// ============================================================================
// Question Enrichment
// ============================================================================

/**
 * Enrich raw questions with metadata for display
 */
export function enrichQuestions(
  questions: RawQuizQuestion[],
  concepts: ConceptWithDetails[],
  topics: TopicData[],
  subtopics: SubtopicData[]
): QuizQuestionWithMeta[] {
  const conceptMap = new Map(concepts.map((c) => [c.id, c]));
  const topicMap = new Map(topics.map((t) => [t.id, t]));
  const subtopicMap = new Map(subtopics.map((s) => [s.id, s]));

  return questions.map((q) => {
    const concept = conceptMap.get(q.concept_id);
    const topic = topicMap.get(q.topic_id);
    const subtopic = q.subtopic_id ? subtopicMap.get(q.subtopic_id) : null;

    return {
      ...q,
      conceptName: concept?.name || 'Unknown Concept',
      topicName: topic?.name || 'Unknown Topic',
      subtopicName: subtopic?.name || null,
      masteryLevel: concept?.mastery_level || 'Cooked',
      streakCorrect: concept?.streak_correct || 0,
      streakIncorrect: concept?.streak_incorrect || 0,
    };
  });
}

// ============================================================================
// Question Selection - Normal Mode
// ============================================================================

/**
 * Select questions randomly (normal mode)
 */
function selectQuestionsNormal(
  questions: QuizQuestionWithMeta[],
  count: number
): QuizQuestionWithMeta[] {
  const shuffled = shuffleArray(questions);
  return shuffled.slice(0, count);
}

// ============================================================================
// Question Selection - Target Weakness Mode
// ============================================================================

/**
 * Select questions weighted by low mastery (target weakness mode)
 */
function selectQuestionsTargetWeakness(
  questions: QuizQuestionWithMeta[],
  concepts: ConceptWithDetails[],
  count: number
): QuizQuestionWithMeta[] {
  // Group questions by concept
  const questionsByConcept = new Map<string, QuizQuestionWithMeta[]>();
  for (const q of questions) {
    const existing = questionsByConcept.get(q.concept_id) || [];
    existing.push(q);
    questionsByConcept.set(q.concept_id, existing);
  }

  // Get concept weights
  const conceptsWithQuestions = concepts.filter((c) =>
    questionsByConcept.has(c.id)
  );

  if (conceptsWithQuestions.length === 0) {
    return [];
  }

  // Weighted selection of concepts
  const selectedQuestions: QuizQuestionWithMeta[] = [];
  const usedConceptIds = new Set<string>();
  const usedQuestionIds = new Set<string>();

  while (selectedQuestions.length < count && usedConceptIds.size < conceptsWithQuestions.length) {
    // Calculate weights for remaining concepts
    const availableConcepts = conceptsWithQuestions.filter(
      (c) => !usedConceptIds.has(c.id)
    );

    if (availableConcepts.length === 0) break;

    // Weighted random selection
    const totalWeight = availableConcepts.reduce(
      (sum, c) => sum + Math.max(MASTERY_WEIGHTS[c.mastery_level], 0.1),
      0
    );

    let random = Math.random() * totalWeight;
    let selectedConcept: ConceptWithDetails | null = null;

    for (const concept of availableConcepts) {
      random -= Math.max(MASTERY_WEIGHTS[concept.mastery_level], 0.1);
      if (random <= 0) {
        selectedConcept = concept;
        break;
      }
    }

    if (!selectedConcept) {
      selectedConcept = availableConcepts[availableConcepts.length - 1];
    }

    usedConceptIds.add(selectedConcept.id);

    // Get questions for this concept and pick one randomly
    const conceptQuestions = questionsByConcept.get(selectedConcept.id) || [];
    const availableQuestions = conceptQuestions.filter(
      (q) => !usedQuestionIds.has(q.id)
    );

    if (availableQuestions.length > 0) {
      const randomQuestion =
        availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
      selectedQuestions.push(randomQuestion);
      usedQuestionIds.add(randomQuestion.id);
    }
  }

  // If we still need more questions, fill with remaining questions
  if (selectedQuestions.length < count) {
    const remainingQuestions = questions.filter(
      (q) => !usedQuestionIds.has(q.id)
    );
    const shuffledRemaining = shuffleArray(remainingQuestions);
    
    for (const q of shuffledRemaining) {
      if (selectedQuestions.length >= count) break;
      selectedQuestions.push(q);
    }
  }

  return shuffleArray(selectedQuestions);
}

// ============================================================================
// Question Selection - Suggested Topics Mode
// ============================================================================

/**
 * Select questions from topics with lowest average mastery
 */
function selectQuestionsSuggestedTopics(
  questions: QuizQuestionWithMeta[],
  topicsForSelection: TopicForSelection[],
  count: number
): QuizQuestionWithMeta[] {
  // Sort topics by average mastery weight (ascending = weakest first)
  const sortedTopics = [...topicsForSelection]
    .filter((t) => t.questionCount > 0)
    .sort((a, b) => {
      // First by average mastery (lower = weaker = prioritize)
      const masteryDiff = a.averageMasteryWeight - b.averageMasteryWeight;
      if (Math.abs(masteryDiff) > 0.1) return masteryDiff;
      // Then by question count (more questions = more to practice)
      return b.questionCount - a.questionCount;
    });

  if (sortedTopics.length === 0) {
    return shuffleArray(questions).slice(0, count);
  }

  // Take topics until we have enough questions
  const selectedTopicIds = new Set<string>();
  let questionPool: QuizQuestionWithMeta[] = [];

  for (const topic of sortedTopics) {
    if (questionPool.length >= count) break;
    selectedTopicIds.add(topic.id);
    const topicQuestions = questions.filter((q) => q.topic_id === topic.id);
    questionPool.push(...topicQuestions);
  }

  // Shuffle and take requested count
  return shuffleArray(questionPool).slice(0, count);
}

// ============================================================================
// Main Selection Function
// ============================================================================

export interface SelectQuestionsParams {
  questions: RawQuizQuestion[];
  concepts: ConceptWithDetails[];
  topics: TopicData[];
  subtopics: SubtopicData[];
  selectedTopicIds: string[];
  mode: QuizMode;
  numQuestions: number;
}

export interface SelectQuestionsResult {
  questions: QueuedQuestion[];
  effectiveCount: number;
  availableCount: number;
  masterySnapshot: MasterySnapshot;
}

/**
 * Main function to select and prepare questions for a quiz
 */
export function selectQuestions(params: SelectQuestionsParams): SelectQuestionsResult {
  const {
    questions,
    concepts,
    topics,
    subtopics,
    selectedTopicIds,
    mode,
    numQuestions,
  } = params;

  // Filter questions by selected topics (if any)
  let filteredQuestions = questions;
  if (selectedTopicIds.length > 0) {
    const topicIdSet = new Set(selectedTopicIds);
    filteredQuestions = questions.filter((q) => topicIdSet.has(q.topic_id));
  }

  // Filter concepts by selected topics (if any)
  let filteredConcepts = concepts;
  if (selectedTopicIds.length > 0) {
    const topicIdSet = new Set(selectedTopicIds);
    filteredConcepts = concepts.filter((c) => topicIdSet.has(c.topic_id));
  }

  // Enrich questions with metadata
  const enrichedQuestions = enrichQuestions(
    filteredQuestions,
    concepts,
    topics,
    subtopics
  );

  const availableCount = enrichedQuestions.length;

  // Select questions based on mode
  let selectedQuestions: QuizQuestionWithMeta[];

  switch (mode) {
    case 'normal':
      selectedQuestions = selectQuestionsNormal(enrichedQuestions, numQuestions);
      break;

    case 'targetWeakness':
      selectedQuestions = selectQuestionsTargetWeakness(
        enrichedQuestions,
        filteredConcepts,
        numQuestions
      );
      break;

    case 'suggestedTopics':
      const topicsForSelection = computeTopicsForSelection(
        topics.filter(
          (t) =>
            selectedTopicIds.length === 0 || selectedTopicIds.includes(t.id)
        ),
        filteredConcepts,
        filteredQuestions
      );
      selectedQuestions = selectQuestionsSuggestedTopics(
        enrichedQuestions,
        topicsForSelection,
        numQuestions
      );
      break;

    default:
      selectedQuestions = selectQuestionsNormal(enrichedQuestions, numQuestions);
  }

  // Create mastery snapshot
  const masterySnapshot: MasterySnapshot = {};
  const conceptsInQuiz = new Set(selectedQuestions.map((q) => q.concept_id));
  for (const concept of concepts) {
    if (conceptsInQuiz.has(concept.id)) {
      masterySnapshot[concept.id] = {
        level: concept.mastery_level,
        streakCorrect: concept.streak_correct,
        streakIncorrect: concept.streak_incorrect,
      };
    }
  }

  // Convert to queued questions
  const queuedQuestions: QueuedQuestion[] = selectedQuestions.map((q) => ({
    ...q,
    appearanceCount: 0,
    maxAppearances: 3, // MAX_QUESTION_APPEARANCES
  }));

  return {
    questions: queuedQuestions,
    effectiveCount: queuedQuestions.length,
    availableCount,
    masterySnapshot,
  };
}

// ============================================================================
// Active Recall Queue Management
// ============================================================================

/**
 * Re-queue a question for Active Recall
 * Returns the updated queue, or null if question can't be re-queued
 */
export function requeueQuestionForActiveRecall(
  queue: QueuedQuestion[],
  currentIndex: number
): QueuedQuestion[] | null {
  const question = queue[currentIndex];
  
  if (!question || question.appearanceCount >= question.maxAppearances) {
    return null;
  }

  // Create a copy of the queue
  const newQueue = [...queue];
  
  // Create updated question with incremented appearance count
  const requeuedQuestion: QueuedQuestion = {
    ...question,
    appearanceCount: question.appearanceCount + 1,
  };

  // Add to end of queue
  newQueue.push(requeuedQuestion);

  return newQueue;
}

// ============================================================================
// Summary Computation
// ============================================================================

/**
 * Compute quiz summary from answers and mastery data
 */
export function computeQuizSummary(
  answers: AnswerRecord[],
  masterySnapshot: MasterySnapshot,
  currentMastery: Map<string, { level: MasteryLevel; conceptName: string; topicName: string }>
): QuizSummary {
  // Track unique questions and first attempts
  const firstAttempts = new Map<string, AnswerRecord>();
  const attemptCounts = new Map<string, number>();

  for (const answer of answers) {
    attemptCounts.set(
      answer.questionId,
      (attemptCounts.get(answer.questionId) || 0) + 1
    );
    
    if (!firstAttempts.has(answer.questionId)) {
      firstAttempts.set(answer.questionId, answer);
    }
  }

  const totalQuestions = firstAttempts.size;
  const totalAttempts = answers.length;
  const correctFirstTry = Array.from(firstAttempts.values()).filter(
    (a) => a.isCorrect
  ).length;
  const correctTotal = answers.filter((a) => a.isCorrect).length;
  const scorePercent =
    totalQuestions > 0 ? Math.round((correctFirstTry / totalQuestions) * 100) : 0;

  // Compute concept results
  const conceptResults = new Map<string, ConceptResult>();
  
  for (const answer of answers) {
    const snapshot = masterySnapshot[answer.conceptId];
    const current = currentMastery.get(answer.conceptId);
    
    if (!conceptResults.has(answer.conceptId)) {
      conceptResults.set(answer.conceptId, {
        conceptId: answer.conceptId,
        conceptName: current?.conceptName || 'Unknown',
        topicName: current?.topicName || 'Unknown',
        masteryBefore: snapshot?.level || 'Cooked',
        masteryAfter: current?.level || 'Cooked',
        improved: false,
        decreased: false,
        attempts: 0,
        correctAttempts: 0,
      });
    }

    const result = conceptResults.get(answer.conceptId)!;
    result.attempts++;
    if (answer.isCorrect) {
      result.correctAttempts++;
    }
  }

  // Determine improvement/decrease
  const masteryOrder: MasteryLevel[] = ['Cooked', 'Meh', "There's Hope", 'Locked in'];
  const allResults = Array.from(conceptResults.values());
  
  for (const result of allResults) {
    const beforeIndex = masteryOrder.indexOf(result.masteryBefore);
    const afterIndex = masteryOrder.indexOf(result.masteryAfter);
    
    result.improved = afterIndex > beforeIndex;
    result.decreased = afterIndex < beforeIndex;
  }

  return {
    totalQuestions,
    totalAttempts,
    correctFirstTry,
    correctTotal,
    scorePercent,
    conceptsImproved: allResults.filter((r) => r.improved),
    conceptsUnchanged: allResults.filter((r) => !r.improved && !r.decreased),
    conceptsDecreased: allResults.filter((r) => r.decreased),
    conceptsStillWeak: allResults.filter(
      (r) => r.masteryAfter === 'Cooked' || r.masteryAfter === 'Meh'
    ),
  };
}

