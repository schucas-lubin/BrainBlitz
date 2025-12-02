/**
 * Mastery tracking logic for concepts
 * 
 * Pure functions for calculating mastery level transitions based on answer streaks.
 * Used by quizzes and games to update concept mastery.
 */

import type { MasteryLevel } from './constants';
import { MASTERY_LEVELS } from './constants';

/**
 * Current mastery state of a concept
 */
export interface MasteryState {
  level: MasteryLevel;
  streakCorrect: number;
  streakIncorrect: number;
}

/**
 * Initial mastery state for a new concept
 */
export const INITIAL_MASTERY_STATE: MasteryState = {
  level: 'Cooked',
  streakCorrect: 0,
  streakIncorrect: 0,
};

/**
 * Updates mastery state based on whether the answer was correct or incorrect
 * 
 * @param prev - Previous mastery state
 * @param isCorrect - Whether the answer was correct
 * @returns Updated mastery state
 * 
 * @example
 * // Starting state
 * const state = { level: 'Cooked', streakCorrect: 0, streakIncorrect: 0 };
 * 
 * // After 3 correct answers
 * let updated = updateMastery(state, true); // streakCorrect = 1
 * updated = updateMastery(updated, true);  // streakCorrect = 2
 * updated = updateMastery(updated, true);    // level = 'Meh', streakCorrect = 0
 * 
 * // After 2 incorrect answers from 'Meh'
 * updated = updateMastery(updated, false);  // streakIncorrect = 1
 * updated = updateMastery(updated, false);  // level = 'Cooked', streakIncorrect = 0
 */
export function updateMastery(prev: MasteryState, isCorrect: boolean): MasteryState {
  if (isCorrect) {
    return updateMasteryOnCorrect(prev);
  } else {
    return updateMasteryOnIncorrect(prev);
  }
}

/**
 * Updates mastery state when answer is correct
 */
function updateMasteryOnCorrect(prev: MasteryState): MasteryState {
  const newStreakCorrect = prev.streakCorrect + 1;
  const newStreakIncorrect = 0;

  // Transition rules based on current level
  switch (prev.level) {
    case 'Cooked':
      // Cooked → Meh: need 3 correct answers
      if (newStreakCorrect >= 3) {
        return {
          level: 'Meh',
          streakCorrect: 0,
          streakIncorrect: newStreakIncorrect,
        };
      }
      return {
        ...prev,
        streakCorrect: newStreakCorrect,
        streakIncorrect: newStreakIncorrect,
      };

    case 'Meh':
      // Meh → There's Hope: need 2 correct answers
      if (newStreakCorrect >= 2) {
        return {
          level: "There's Hope",
          streakCorrect: 0,
          streakIncorrect: newStreakIncorrect,
        };
      }
      return {
        ...prev,
        streakCorrect: newStreakCorrect,
        streakIncorrect: newStreakIncorrect,
      };

    case "There's Hope":
      // There's Hope → Locked in: need 2 correct answers
      if (newStreakCorrect >= 2) {
        return {
          level: 'Locked in',
          streakCorrect: 0,
          streakIncorrect: newStreakIncorrect,
        };
      }
      return {
        ...prev,
        streakCorrect: newStreakCorrect,
        streakIncorrect: newStreakIncorrect,
      };

    case 'Locked in':
      // Locked in: stay locked in regardless of streak (no further level up)
      return {
        ...prev,
        streakCorrect: newStreakCorrect,
        streakIncorrect: newStreakIncorrect,
      };

    default:
      // TypeScript exhaustiveness check
      const _exhaustive: never = prev.level;
      return _exhaustive;
  }
}

/**
 * Updates mastery state when answer is incorrect
 */
function updateMasteryOnIncorrect(prev: MasteryState): MasteryState {
  const newStreakIncorrect = prev.streakIncorrect + 1;
  const newStreakCorrect = 0;

  // Transition rules based on current level
  switch (prev.level) {
    case 'Cooked':
      // Cooked: stay Cooked (just update streak)
      return {
        ...prev,
        streakCorrect: newStreakCorrect,
        streakIncorrect: newStreakIncorrect,
      };

    case 'Meh':
      // Meh → Cooked: need 2 incorrect answers
      if (newStreakIncorrect >= 2) {
        return {
          level: 'Cooked',
          streakCorrect: newStreakCorrect,
          streakIncorrect: 0,
        };
      }
      return {
        ...prev,
        streakCorrect: newStreakCorrect,
        streakIncorrect: newStreakIncorrect,
      };

    case "There's Hope":
      // There's Hope → Meh: need 2 incorrect answers
      if (newStreakIncorrect >= 2) {
        return {
          level: 'Meh',
          streakCorrect: newStreakCorrect,
          streakIncorrect: 0,
        };
      }
      return {
        ...prev,
        streakCorrect: newStreakCorrect,
        streakIncorrect: newStreakIncorrect,
      };

    case 'Locked in':
      // Locked in → There's Hope: need 2 incorrect answers
      if (newStreakIncorrect >= 2) {
        return {
          level: "There's Hope",
          streakCorrect: newStreakCorrect,
          streakIncorrect: 0,
        };
      }
      return {
        ...prev,
        streakCorrect: newStreakCorrect,
        streakIncorrect: newStreakIncorrect,
      };

    default:
      // TypeScript exhaustiveness check
      const _exhaustive: never = prev.level;
      return _exhaustive;
  }
}

/**
 * Test cases (for reference and validation):
 * 
 * // Test 1: Cooked → Meh (3 correct)
 * let state = INITIAL_MASTERY_STATE;
 * state = updateMastery(state, true);  // streakCorrect = 1
 * state = updateMastery(state, true);  // streakCorrect = 2
 * state = updateMastery(state, true);  // level = 'Meh', streakCorrect = 0
 * // Expected: { level: 'Meh', streakCorrect: 0, streakIncorrect: 0 }
 * 
 * // Test 2: Meh → Cooked (2 incorrect)
 * state = { level: 'Meh', streakCorrect: 0, streakIncorrect: 0 };
 * state = updateMastery(state, false); // streakIncorrect = 1
 * state = updateMastery(state, false); // level = 'Cooked', streakIncorrect = 0
 * // Expected: { level: 'Cooked', streakCorrect: 0, streakIncorrect: 0 }
 * 
 * // Test 3: Meh → There's Hope (2 correct)
 * state = { level: 'Meh', streakCorrect: 0, streakIncorrect: 0 };
 * state = updateMastery(state, true);  // streakCorrect = 1
 * state = updateMastery(state, true);  // level = "There's Hope", streakCorrect = 0
 * // Expected: { level: "There's Hope", streakCorrect: 0, streakIncorrect: 0 }
 * 
 * // Test 4: Locked in stays locked in
 * state = { level: 'Locked in', streakCorrect: 5, streakIncorrect: 0 };
 * state = updateMastery(state, true);  // streakCorrect = 6
 * // Expected: { level: 'Locked in', streakCorrect: 6, streakIncorrect: 0 }
 * 
 * // Test 5: Locked in → There's Hope (2 incorrect)
 * state = { level: 'Locked in', streakCorrect: 0, streakIncorrect: 0 };
 * state = updateMastery(state, false); // streakIncorrect = 1
 * state = updateMastery(state, false); // level = "There's Hope", streakIncorrect = 0
 * // Expected: { level: "There's Hope", streakCorrect: 0, streakIncorrect: 0 }
 */

