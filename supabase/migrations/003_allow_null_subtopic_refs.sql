-- BrainBlitz Migration: Allow NULL subtopic references for quiz/game entries
-- Created: 2025-12-04
-- Description: Enables orphan concepts to generate quiz questions and word game entries
--              by allowing subtopic_id to be NULL on the derived tables.

-- ============================================================================
-- 1. Allow NULL subtopic_id on quiz_questions
-- ============================================================================

ALTER TABLE quiz_questions
  ALTER COLUMN subtopic_id DROP NOT NULL;

-- ============================================================================
-- 2. Allow NULL subtopic_id on word_game_entries
-- ============================================================================

ALTER TABLE word_game_entries
  ALTER COLUMN subtopic_id DROP NOT NULL;

