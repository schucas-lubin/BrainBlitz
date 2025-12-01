// TODO: Replace with real LLM API integration
// This file defines the types and interfaces for AI-generated content

export interface Topic {
  id: string;
  sessionId: string;
  name: string;
  orderIndex: number;
  generatedNotesMmd?: string;
  userNotesMmd?: string;
  specialResources?: unknown;
}

export interface Subtopic {
  id: string;
  sessionId: string;
  topicId: string;
  name: string;
  orderIndex: number;
  generatedNotesMmd?: string;
  userNotesMmd?: string;
  specialResources?: unknown;
}

export interface Concept {
  id: string;
  sessionId: string;
  topicId: string;
  subtopicId: string;
  name: string;
  orderIndex: number;
  generatedNotesMmd?: string;
  userNotesMmd?: string;
  specialResources?: unknown;
  masteryLevel: 'Cooked' | 'Meh' | "There's Hope" | 'Locked in';
  streakCorrect: number;
  streakIncorrect: number;
}

export interface TopicTree {
  topics: Topic[];
  subtopics: Subtopic[];
  concepts: Concept[];
}

export interface QuizQuestion {
  id: string;
  sessionId: string;
  topicId: string;
  subtopicId: string;
  conceptId: string;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
}

export interface WordGameEntry {
  id: string;
  sessionId: string;
  topicId: string;
  subtopicId: string;
  conceptId: string;
  word: string;
  clue: string;
  orderIndex?: number;
}

export interface GenerateContentInput {
  rawMmd?: string;
  existingTopicTree?: TopicTree;
  userInstructions?: string;
}

export interface GenerateContentResult {
  topicTree?: TopicTree;
  questions?: QuizQuestion[];
  wordGameEntries?: WordGameEntry[];
  notes?: {
    topicId?: string;
    subtopicId?: string;
    conceptId?: string;
    generatedNotesMmd: string;
  }[];
}

/**
 * Generates content (topic trees, questions, game entries, notes) using an LLM.
 * 
 * TODO: Implement real LLM API calls using OPENAI_API_KEY or equivalent
 * This should be called from server-side code only (API routes, server actions)
 */
export async function generateContent(
  input: GenerateContentInput
): Promise<GenerateContentResult> {
  // Stub implementation - will be replaced with real LLM calls
  throw new Error('generateContent not yet implemented - LLM integration pending');
}

