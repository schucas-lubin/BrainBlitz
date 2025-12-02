# BrainBlitz Utility Libraries

This directory contains pure utility functions and constants used throughout the application.

## Files

### `constants.ts`
Centralized constants including:
- Mastery level types and arrays
- Mastery weights for target weaknesses selection
- Order index constants for hierarchical ordering

### `mastery.ts`
Pure functions for mastery tracking:
- `updateMastery()` - Updates mastery state based on correct/incorrect answers
- `MasteryState` interface
- `INITIAL_MASTERY_STATE` constant

**Usage:**
```typescript
import { updateMastery, INITIAL_MASTERY_STATE } from '@/lib/mastery';

// After a quiz question or game answer
const newState = updateMastery(
  { level: 'Cooked', streakCorrect: 2, streakIncorrect: 0 },
  true // isCorrect
);
// Returns: { level: 'Meh', streakCorrect: 0, streakIncorrect: 0 }
```

### `targetWeaknesses.ts`
Weighted random selection for target weaknesses mode:
- `selectConceptForTargetWeakness()` - Selects a single concept
- `selectMultipleConceptsForTargetWeakness()` - Selects multiple concepts

**Usage:**
```typescript
import { selectConceptForTargetWeakness } from '@/lib/targetWeaknesses';

// In quiz/game mode
const concepts = [
  { id: '1', masteryLevel: 'Cooked' },
  { id: '2', masteryLevel: 'Meh' },
  { id: '3', masteryLevel: "There's Hope" },
];
const selectedId = selectConceptForTargetWeakness(concepts);
```

## Integration Points

### Quiz Mode (`app/sessions/[id]/page.tsx` - Quiz tab)
- Use `selectConceptForTargetWeakness()` to choose next question
- Use `updateMastery()` after each answer
- Update concept in database with new mastery state

### Game Mode (`components/WordGame.tsx`)
- Use `selectConceptForTargetWeakness()` to choose next word
- Use `updateMastery()` after game completion (success/failure)
- Update concept in database with new mastery state

### Topic Tree Management (future)
- Use `ORDER_INDEX_STEP` and `INITIAL_ORDER_INDEX` when creating topics/subtopics/concepts
- Implement reordering utilities using order index gaps

