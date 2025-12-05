-- BrainBlitz Migration: Add needs_research and support orphan concepts
-- Created: 2025-01-XX
-- Description: Adds needs_research flag to concepts and enables orphan concepts (concepts without subtopics)

-- ============================================================================
-- 1. ADD needs_research COLUMN TO concepts
-- ============================================================================

ALTER TABLE concepts ADD COLUMN needs_research BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN concepts.needs_research IS 'Flag indicating if concept should be researched more deeply (e.g., using web browsing)';

-- ============================================================================
-- 2. ENABLE ORPHAN CONCEPTS (concepts without subtopics)
-- ============================================================================

-- Make subtopic_id nullable to allow orphan concepts
ALTER TABLE concepts ALTER COLUMN subtopic_id DROP NOT NULL;

-- Drop the unique constraint on (subtopic_id, order_index) since subtopic_id can be null
-- We'll need a different approach for ordering orphan concepts
ALTER TABLE concepts DROP CONSTRAINT concepts_subtopic_order_unique;

-- Add new unique constraint that handles null subtopic_id
-- For concepts with subtopic_id: unique per subtopic
-- For orphan concepts (subtopic_id IS NULL): unique per topic
CREATE UNIQUE INDEX concepts_subtopic_order_unique ON concepts(subtopic_id, order_index) 
  WHERE subtopic_id IS NOT NULL;
CREATE UNIQUE INDEX concepts_topic_order_unique_orphans ON concepts(topic_id, order_index) 
  WHERE subtopic_id IS NULL;

-- Add check constraint to ensure orphan concepts have topic_id (already required, but explicit)
-- Note: topic_id is already NOT NULL, so this is mainly for documentation
COMMENT ON COLUMN concepts.subtopic_id IS 'FK to subtopics. NULL for orphan concepts that attach directly to a topic.';

-- ============================================================================
-- 3. UPDATE INDEXES FOR ORPHAN CONCEPTS
-- ============================================================================

-- The existing index on topic_id should already cover orphan concept queries
-- But we can add a partial index for better performance on orphan queries
CREATE INDEX idx_concepts_orphan_concepts ON concepts(topic_id, order_index) 
  WHERE subtopic_id IS NULL;

