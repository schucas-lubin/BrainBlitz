/**
 * Types and utilities for content generation (Job 2)
 */

export interface ContentGenerationInput {
  sessionId: string;
  scope: 'session' | 'subtopic' | 'concept';
  subtopicId?: string;
  conceptId?: string;
  overwriteMode?: 'replace';
}

export interface ConceptContent {
  concept_id: string;
  notes_markdown: string;
  quiz_questions: QuizQuestionContent[];
  word_game_entries: WordGameEntryContent[];
}

export interface QuizQuestionContent {
  question_text: string;
  options: string[];
  correct_option_index: number;
  explanation?: string;
}

export interface WordGameEntryContent {
  word: string;
  clue: string;
  order_index: number; // Must be 10, 20, 30, or 40
}

export interface ContentGenerationOutput {
  session_id: string;
  scope: string;
  concepts: ConceptContent[];
}

/**
 * Validates and normalizes the content generation output from the LLM
 */
export function validateContentGenerationOutput(
  output: unknown,
  sessionId: string,
  expectedConceptIds: string[]
): ContentGenerationOutput {
  if (typeof output !== 'object' || output === null) {
    throw new Error('Content generation output must be an object');
  }

  const obj = output as Record<string, unknown>;

  if (obj.session_id !== sessionId) {
    throw new Error(`Session ID mismatch: expected ${sessionId}, got ${obj.session_id}`);
  }

  if (!Array.isArray(obj.concepts)) {
    throw new Error('Concepts must be an array');
  }

  const concepts: ConceptContent[] = [];

  for (const concept of obj.concepts) {
    if (typeof concept !== 'object' || concept === null) {
      throw new Error('Each concept must be an object');
    }

    const conceptObj = concept as Record<string, unknown>;

    if (typeof conceptObj.concept_id !== 'string') {
      throw new Error('Concept ID must be a string');
    }

    if (!expectedConceptIds.includes(conceptObj.concept_id)) {
      throw new Error(`Unexpected concept ID: ${conceptObj.concept_id}`);
    }

    if (typeof conceptObj.notes_markdown !== 'string') {
      throw new Error('Notes markdown must be a string');
    }

    // Validate quiz questions
    const quizQuestions: QuizQuestionContent[] = [];
    if (Array.isArray(conceptObj.quiz_questions)) {
      for (const q of conceptObj.quiz_questions) {
        if (typeof q !== 'object' || q === null) {
          throw new Error('Each quiz question must be an object');
        }
        const qObj = q as Record<string, unknown>;

        if (typeof qObj.question_text !== 'string') {
          throw new Error('Question text must be a string');
        }
        if (!Array.isArray(qObj.options)) {
          throw new Error('Options must be an array');
        }
        if (qObj.options.length < 2) {
          throw new Error('Quiz question must have at least 2 options');
        }
        if (typeof qObj.correct_option_index !== 'number') {
          throw new Error('Correct option index must be a number');
        }
        if (
          qObj.correct_option_index < 0 ||
          qObj.correct_option_index >= qObj.options.length
        ) {
          throw new Error('Correct option index out of range');
        }

        quizQuestions.push({
          question_text: qObj.question_text,
          options: qObj.options as string[],
          correct_option_index: qObj.correct_option_index,
          explanation: typeof qObj.explanation === 'string' ? qObj.explanation : undefined,
        });
      }
    }

    // Validate word game entries
    const wordGameEntries: WordGameEntryContent[] = [];
    if (Array.isArray(conceptObj.word_game_entries)) {
      if (conceptObj.word_game_entries.length > 4) {
        throw new Error('Maximum 4 word game entries per concept');
      }

      let orderIndex = 10;
      for (const entry of conceptObj.word_game_entries) {
        if (typeof entry !== 'object' || entry === null) {
          throw new Error('Each word game entry must be an object');
        }
        const entryObj = entry as Record<string, unknown>;

        if (typeof entryObj.word !== 'string' || entryObj.word.length < 4) {
          console.warn(
            '[AI][ContentGeneration] Skipping invalid word entry',
            entryObj.word
          );
          continue;
        }
        if (typeof entryObj.clue !== 'string') {
          console.warn(
            '[AI][ContentGeneration] Skipping word entry with invalid clue',
            entryObj
          );
          continue;
        }

        const entryOrderIndex =
          typeof entryObj.order_index === 'number' &&
          [10, 20, 30, 40].includes(entryObj.order_index)
            ? entryObj.order_index
            : orderIndex;

        wordGameEntries.push({
          word: entryObj.word.toUpperCase(), // Normalize to uppercase
          clue: entryObj.clue,
          order_index: entryOrderIndex,
        });

        orderIndex += 10;
        if (orderIndex > 40) break; // Max 4 entries
      }
    }

    concepts.push({
      concept_id: conceptObj.concept_id,
      notes_markdown: conceptObj.notes_markdown,
      quiz_questions: quizQuestions,
      word_game_entries: wordGameEntries,
    });
  }

  return {
    session_id: sessionId,
    scope: typeof obj.scope === 'string' ? obj.scope : 'session',
    concepts,
  };
}

