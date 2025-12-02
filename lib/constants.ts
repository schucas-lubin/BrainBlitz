/**
 * Centralized constants for BrainBlitz
 */

// Mastery levels ordered from lowest to highest
export const MASTERY_LEVELS = ['Cooked', "Meh", "There's Hope", 'Locked in'] as const;

// Type-safe mastery level union
export type MasteryLevel = (typeof MASTERY_LEVELS)[number];

// Weights for "Target Weaknesses" mode selection
// Higher weight = more likely to be selected
export const MASTERY_WEIGHTS: Record<MasteryLevel, number> = {
  Cooked: 3,
  Meh: 2,
  "There's Hope": 1,
  'Locked in': 0,
} as const;

// Order index constants for managing hierarchical ordering
// Using gaps (10, 20, 30...) allows easier insertion between items
export const ORDER_INDEX_STEP = 10;
export const INITIAL_ORDER_INDEX = ORDER_INDEX_STEP;

// Word game entry order indices (max 4 entries per concept)
export const WORD_GAME_ORDER_INDICES = [10, 20, 30, 40] as const;
export const MAX_WORD_GAME_ENTRIES_PER_CONCEPT = WORD_GAME_ORDER_INDICES.length;

