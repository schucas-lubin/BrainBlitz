-- BrainBlitz Initial Schema Migration
-- Created: 2025-12-01
-- Description: Creates all tables, types, indexes, triggers, and RLS policies for BrainBlitz MVP

-- ============================================================================
-- 1. CREATE ENUMS
-- ============================================================================

CREATE TYPE mastery_level AS ENUM ('Cooked', 'Meh', 'There''s Hope', 'Locked in');

-- ============================================================================
-- 2. CREATE TABLES
-- ============================================================================

-- Sessions Table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT, -- Optional: "Chemistry", "Math", etc.
  raw_mmd TEXT, -- Mathpix Markdown content
  deleted_at TIMESTAMPTZ, -- Soft delete for sessions
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT sessions_title_not_empty CHECK (char_length(trim(title)) > 0)
);

-- Topics Table
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 10, -- Use gaps (10, 20, 30...) for easier reordering
  generated_notes_mmd TEXT,
  user_notes_mmd TEXT,
  special_resources JSONB, -- Flexible JSON for figures, tables, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT topics_name_not_empty CHECK (char_length(trim(name)) > 0),
  CONSTRAINT topics_session_order_unique UNIQUE (session_id, order_index)
);

-- Subtopics Table
CREATE TABLE subtopics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 10, -- Use gaps (10, 20, 30...) for easier reordering
  generated_notes_mmd TEXT,
  user_notes_mmd TEXT,
  special_resources JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT subtopics_name_not_empty CHECK (char_length(trim(name)) > 0),
  CONSTRAINT subtopics_topic_order_unique UNIQUE (topic_id, order_index)
);

-- Concepts Table
CREATE TABLE concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  subtopic_id UUID NOT NULL REFERENCES subtopics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 10, -- Use gaps (10, 20, 30...) for easier reordering
  generated_notes_mmd TEXT,
  user_notes_mmd TEXT,
  special_resources JSONB,
  -- Mastery tracking fields
  mastery_level mastery_level NOT NULL DEFAULT 'Cooked',
  streak_correct INTEGER NOT NULL DEFAULT 0,
  streak_incorrect INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT concepts_name_not_empty CHECK (char_length(trim(name)) > 0),
  CONSTRAINT concepts_subtopic_order_unique UNIQUE (subtopic_id, order_index),
  CONSTRAINT concepts_streaks_non_negative CHECK (streak_correct >= 0 AND streak_incorrect >= 0)
);

-- Quiz Questions Table
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  subtopic_id UUID NOT NULL REFERENCES subtopics(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL, -- Can contain MMD
  options JSONB NOT NULL, -- Array of strings: ["Option A", "Option B", ...]
  correct_option_index INTEGER NOT NULL,
  explanation TEXT, -- Optional, can contain MMD
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT quiz_questions_text_not_empty CHECK (char_length(trim(question_text)) > 0),
  CONSTRAINT quiz_questions_options_array CHECK (jsonb_typeof(options) = 'array'),
  CONSTRAINT quiz_questions_correct_index_valid CHECK (
    correct_option_index >= 0 AND 
    correct_option_index < jsonb_array_length(options)
  )
);

-- Word Game Entries Table
CREATE TABLE word_game_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  subtopic_id UUID NOT NULL REFERENCES subtopics(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  word TEXT NOT NULL, -- Answer word, length >= 4
  clue TEXT NOT NULL, -- Definition/prompt
  order_index INTEGER NOT NULL DEFAULT 10, -- For ordering within concept (10, 20, 30, 40 for max 4 per concept)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT word_game_entries_word_length CHECK (char_length(word) >= 4),
  CONSTRAINT word_game_entries_clue_not_empty CHECK (char_length(trim(clue)) > 0),
  CONSTRAINT word_game_entries_concept_order_unique UNIQUE (concept_id, order_index),
  CONSTRAINT word_game_entries_max_per_concept CHECK (
    -- Max 4 entries per concept (order_index 10, 20, 30, 40)
    order_index IN (10, 20, 30, 40)
  )
);

-- ============================================================================
-- 3. CREATE INDEXES
-- ============================================================================

-- Sessions indexes
CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX idx_sessions_subject ON sessions(subject) WHERE subject IS NOT NULL;
CREATE INDEX idx_sessions_deleted_at ON sessions(deleted_at) WHERE deleted_at IS NULL; -- For filtering active sessions

-- Topics indexes
CREATE INDEX idx_topics_session_id ON topics(session_id);
CREATE INDEX idx_topics_session_order ON topics(session_id, order_index);

-- Subtopics indexes
CREATE INDEX idx_subtopics_session_id ON subtopics(session_id);
CREATE INDEX idx_subtopics_topic_id ON subtopics(topic_id);
CREATE INDEX idx_subtopics_topic_order ON subtopics(topic_id, order_index);

-- Concepts indexes
CREATE INDEX idx_concepts_session_id ON concepts(session_id);
CREATE INDEX idx_concepts_topic_id ON concepts(topic_id);
CREATE INDEX idx_concepts_subtopic_id ON concepts(subtopic_id);
CREATE INDEX idx_concepts_mastery_level ON concepts(mastery_level);
CREATE INDEX idx_concepts_session_mastery ON concepts(session_id, mastery_level); -- For "Target Weaknesses" queries

-- Quiz Questions indexes
CREATE INDEX idx_quiz_questions_session_id ON quiz_questions(session_id);
CREATE INDEX idx_quiz_questions_concept_id ON quiz_questions(concept_id);
CREATE INDEX idx_quiz_questions_session_concept ON quiz_questions(session_id, concept_id);

-- Word Game Entries indexes
CREATE INDEX idx_word_game_entries_session_id ON word_game_entries(session_id);
CREATE INDEX idx_word_game_entries_concept_id ON word_game_entries(concept_id);
CREATE INDEX idx_word_game_entries_session_concept ON word_game_entries(session_id, concept_id);

-- ============================================================================
-- 4. CREATE TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON topics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subtopics_updated_at BEFORE UPDATE ON subtopics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_concepts_updated_at BEFORE UPDATE ON concepts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quiz_questions_updated_at BEFORE UPDATE ON quiz_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_word_game_entries_updated_at BEFORE UPDATE ON word_game_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtopics ENABLE ROW LEVEL SECURITY;
ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_game_entries ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. CREATE RLS POLICIES (Single-user MVP)
-- ============================================================================

-- For single-user MVP: Allow all operations
-- TODO: Update when multi-user support is added (add user_id checks)

CREATE POLICY "Allow all for single user" ON sessions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for single user" ON topics
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for single user" ON subtopics
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for single user" ON concepts
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for single user" ON quiz_questions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for single user" ON word_game_entries
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 7. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE sessions IS 'Main study sessions containing topics, questions, and games';
COMMENT ON TABLE topics IS 'Top-level topics within a session';
COMMENT ON TABLE subtopics IS 'Subtopics nested under topics';
COMMENT ON TABLE concepts IS 'Concepts nested under subtopics, with mastery tracking';
COMMENT ON TABLE quiz_questions IS 'Multiple choice questions for quiz mode';
COMMENT ON TABLE word_game_entries IS 'Wordle-style vocabulary game entries';

COMMENT ON COLUMN sessions.deleted_at IS 'Soft delete timestamp for sessions';
COMMENT ON COLUMN concepts.mastery_level IS 'Current mastery level: Cooked (lowest) -> Meh -> There''s Hope -> Locked in (highest)';
COMMENT ON COLUMN concepts.streak_correct IS 'Current streak of correct answers';
COMMENT ON COLUMN concepts.streak_incorrect IS 'Current streak of incorrect answers';
COMMENT ON COLUMN topics.order_index IS 'Display order with gaps (10, 20, 30...) for easier reordering';
COMMENT ON COLUMN word_game_entries.order_index IS 'Order within concept (10, 20, 30, 40) - max 4 entries per concept';

