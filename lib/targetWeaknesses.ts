/**
 * Target Weaknesses selection logic
 * 
 * Pure functions for selecting concepts based on mastery levels.
 * Used by quiz and game modes to prioritize low-mastery concepts.
 */

import type { MasteryLevel } from './constants';
import { MASTERY_WEIGHTS } from './constants';

/**
 * Concept with mastery information for target weaknesses selection
 */
export interface ConceptWithMastery {
  id: string;
  masteryLevel: MasteryLevel;
}

/**
 * Selects a concept ID using weighted random selection based on mastery levels.
 * Concepts with lower mastery levels have higher weights and are more likely to be selected.
 * 
 * @param concepts - Array of concepts with mastery information
 * @returns Selected concept ID, or null if no valid concepts available
 * 
 * @example
 * const concepts = [
 *   { id: '1', masteryLevel: 'Cooked' },      // weight = 3
 *   { id: '2', masteryLevel: 'Meh' },         // weight = 2
 *   { id: '3', masteryLevel: "There's Hope" }, // weight = 1
 *   { id: '4', masteryLevel: 'Locked in' },   // weight = 0 (ignored)
 * ];
 * 
 * const selectedId = selectConceptForTargetWeakness(concepts);
 * // Returns '1', '2', or '3' with probabilities 3/6, 2/6, 1/6 respectively
 */
export function selectConceptForTargetWeakness(
  concepts: ConceptWithMastery[]
): string | null {
  if (concepts.length === 0) {
    return null;
  }

  // Calculate weights for each concept
  const weightedConcepts = concepts
    .map((concept) => ({
      id: concept.id,
      weight: MASTERY_WEIGHTS[concept.masteryLevel],
    }))
    .filter((item) => item.weight > 0); // Ignore concepts with weight <= 0

  if (weightedConcepts.length === 0) {
    return null; // All concepts have weight 0 (all Locked in)
  }

  // Calculate total weight
  const totalWeight = weightedConcepts.reduce((sum, item) => sum + item.weight, 0);

  if (totalWeight === 0) {
    return null;
  }

  // Generate random number in [0, totalWeight)
  const random = Math.random() * totalWeight;

  // Find the concept where cumulative weight exceeds random
  let cumulativeWeight = 0;
  for (const item of weightedConcepts) {
    cumulativeWeight += item.weight;
    if (random < cumulativeWeight) {
      return item.id;
    }
  }

  // Fallback (shouldn't happen, but TypeScript safety)
  return weightedConcepts[weightedConcepts.length - 1].id;
}

/**
 * Selects multiple concept IDs using weighted random selection (without replacement).
 * Useful for selecting a batch of questions/words for a quiz/game session.
 * 
 * @param concepts - Array of concepts with mastery information
 * @param count - Number of concepts to select
 * @returns Array of selected concept IDs (may be fewer than count if not enough concepts)
 * 
 * @example
 * const concepts = [
 *   { id: '1', masteryLevel: 'Cooked' },
 *   { id: '2', masteryLevel: 'Meh' },
 *   { id: '3', masteryLevel: "There's Hope" },
 * ];
 * 
 * const selectedIds = selectMultipleConceptsForTargetWeakness(concepts, 2);
 * // Returns array of 2 concept IDs, weighted by mastery level
 */
export function selectMultipleConceptsForTargetWeakness(
  concepts: ConceptWithMastery[],
  count: number
): string[] {
  if (count <= 0 || concepts.length === 0) {
    return [];
  }

  const selected: string[] = [];
  const available = [...concepts]; // Copy to avoid mutating input

  for (let i = 0; i < count && available.length > 0; i++) {
    const selectedId = selectConceptForTargetWeakness(available);
    if (selectedId === null) {
      break; // No more valid concepts
    }

    selected.push(selectedId);
    // Remove selected concept from available pool (no replacement)
    const index = available.findIndex((c) => c.id === selectedId);
    if (index !== -1) {
      available.splice(index, 1);
    }
  }

  return selected;
}

/**
 * TODO: Usage examples for integration:
 * 
 * // In quiz mode:
 * import { selectConceptForTargetWeakness } from '@/lib/targetWeaknesses';
 * import { updateMastery } from '@/lib/mastery';
 * 
 * // Get concepts for session
 * const concepts = await getConceptsForSession(sessionId);
 * 
 * // Select next question concept (target weaknesses mode)
 * const conceptId = selectConceptForTargetWeakness(concepts);
 * const question = await getQuestionForConcept(conceptId);
 * 
 * // After answer:
 * const concept = concepts.find(c => c.id === conceptId);
 * const newMastery = updateMastery(
 *   { level: concept.masteryLevel, streakCorrect: concept.streakCorrect, streakIncorrect: concept.streakIncorrect },
 *   isCorrect
 * );
 * await updateConceptMastery(conceptId, newMastery);
 * 
 * // In game mode:
 * const wordGameEntry = await getWordGameEntryForConcept(conceptId);
 * // ... play game ...
 * const newMastery = updateMastery(concept.mastery, gameWon);
 * await updateConceptMastery(conceptId, newMastery);
 */

