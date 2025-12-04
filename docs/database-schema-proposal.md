# BrainBlitz Database Schema Proposal

## Overview
This document proposes the database schema for BrainBlitz based on the project specifications. The schema uses PostgreSQL (via Supabase) with proper relationships, constraints, and indexes.

## Questions for Clarification

### 1. **ID Strategy**
- **Question**: Should we use UUIDs or auto-incrementing integers for primary keys?
- **Recommendation**: UUIDs (better for distributed systems, no collisions, but slightly larger storage)
- **Alternative**: Auto-incrementing BIGSERIAL (simpler, smaller, but predictable)

### 2. **User/Auth Strategy**
- **Question**: Since it's single-user now but may expand later, should we:
  - Add a `user_id` column to all tables now (prepared for multi-user)?
  - Or add it later via migration?
- **Recommendation**: Add `user_id` now with a default/placeholder value, or use Supabase Auth and add `auth.uid()` references

### 3. **Special Resources Storage**
- **Question**: Should `special_resources` be:
  - JSONB column (flexible, queryable)?
  - Separate table with foreign keys?
  - References to MMD fragments (text pointers)?
- **Recommendation**: JSONB for MVP (flexible), can normalize later if needed

### 4. **MMD Storage**
- **Question**: For large MMD files, should we:
  - Store directly in `sessions.raw_mmd` (TEXT)?
  - Use Supabase Storage and store references?
- **Recommendation**: TEXT column for MVP (Postgres handles large text well), migrate to storage if files exceed ~1MB

### 5. **Timestamps**
- **Question**: Should we track `updated_at` in addition to `created_at`?
- **Recommendation**: Yes, for all tables (useful for sync, debugging, future features)

### 6. **Soft Deletes**
- **Question**: Should we implement soft deletes (deleted_at) or hard deletes?
- **Recommendation**: Soft deletes for user-generated content (sessions, notes), hard deletes for generated content (questions, game entries can be regenerated)

### 7. **Order Index**
- **Question**: Should `order_index` be:
  - Integer (0, 1, 2...) allowing gaps for reordering?
  - Decimal/Float for easier insertion between items?
- **Recommendation**: Integer with gaps (simpler, can renumber when needed)

---

## Proposed Schema

### 1. Sessions Table
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT, -- Optional: "Chemistry", "Math", etc.
  raw_mmd TEXT, -- Mathpix Markdown content
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- For future multi-user support:
  -- user_id UUID REFERENCES auth.users(id),
  
  CONSTRAINT sessions_title_not_empty CHECK (char_length(trim(title)) > 0)
);

CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX idx_sessions_subject ON sessions(subject) WHERE subject IS NOT NULL;
-- Future: CREATE INDEX idx_sessions_user_id ON sessions(user_id);
```

### 2. Topics Table
```sql
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  generated_notes_mmd TEXT,
  user_notes_mmd TEXT,
  special_resources JSONB, -- Flexible JSON for figures, tables, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT topics_name_not_empty CHECK (char_length(trim(name)) > 0),
  CONSTRAINT topics_session_order_unique UNIQUE (session_id, order_index)
);

CREATE INDEX idx_topics_session_id ON topics(session_id);
CREATE INDEX idx_topics_session_order ON topics(session_id, order_index);
```

### 3. Subtopics Table
```sql
CREATE TABLE subtopics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  generated_notes_mmd TEXT,
  user_notes_mmd TEXT,
  special_resources JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT subtopics_name_not_empty CHECK (char_length(trim(name)) > 0),
  CONSTRAINT subtopics_topic_order_unique UNIQUE (topic_id, order_index)
);

CREATE INDEX idx_subtopics_session_id ON subtopics(session_id);
CREATE INDEX idx_subtopics_topic_id ON subtopics(topic_id);
CREATE INDEX idx_subtopics_topic_order ON subtopics(topic_id, order_index);
```

### 4. Concepts Table
```sql
CREATE TYPE mastery_level AS ENUM ('Cooked', 'Meh', 'There''s Hope', 'Locked in');

CREATE TABLE concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  subtopic_id UUID NOT NULL REFERENCES subtopics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
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

CREATE INDEX idx_concepts_session_id ON concepts(session_id);
CREATE INDEX idx_concepts_topic_id ON concepts(topic_id);
CREATE INDEX idx_concepts_subtopic_id ON concepts(subtopic_id);
CREATE INDEX idx_concepts_mastery_level ON concepts(mastery_level);
CREATE INDEX idx_concepts_session_mastery ON concepts(session_id, mastery_level);
```

### 5. Quiz Questions Table
```sql
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

CREATE INDEX idx_quiz_questions_session_id ON quiz_questions(session_id);
CREATE INDEX idx_quiz_questions_concept_id ON quiz_questions(concept_id);
CREATE INDEX idx_quiz_questions_session_concept ON quiz_questions(session_id, concept_id);
```

### 6. Word Game Entries Table
```sql
CREATE TABLE word_game_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  subtopic_id UUID NOT NULL REFERENCES subtopics(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  word TEXT NOT NULL, -- Answer word, length >= 4
  clue TEXT NOT NULL, -- Definition/prompt
  order_index INTEGER NOT NULL DEFAULT 0, -- For ordering within concept (0-3, max 4 per concept)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT word_game_entries_word_length CHECK (char_length(word) >= 4),
  CONSTRAINT word_game_entries_clue_not_empty CHECK (char_length(trim(clue)) > 0),
  CONSTRAINT word_game_entries_concept_order_unique UNIQUE (concept_id, order_index),
  CONSTRAINT word_game_entries_max_per_concept CHECK (
    -- Enforced via application logic or trigger
    -- Max 4 entries per concept (order_index 0-3)
    order_index >= 0 AND order_index < 4
  )
);

CREATE INDEX idx_word_game_entries_session_id ON word_game_entries(session_id);
CREATE INDEX idx_word_game_entries_concept_id ON word_game_entries(concept_id);
CREATE INDEX idx_word_game_entries_session_concept ON word_game_entries(session_id, concept_id);
```

### 7. Trigger for Updated At Timestamps
```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
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
```

### 8. Row Level Security (RLS) Policies
```sql
-- Enable RLS on all tables
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtopics ENABLE ROW LEVEL SECURITY;
ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_game_entries ENABLE ROW LEVEL SECURITY;

-- For single-user MVP: Allow all operations
-- TODO: Update when multi-user support is added
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
```

---

## Additional Considerations

### Constraints & Validations
- ✅ All foreign keys have `ON DELETE CASCADE` (deleting a session removes all related data)
- ✅ Text fields have `NOT NULL` constraints where required
- ✅ Check constraints for data validation (word length, option index, etc.)
- ✅ Unique constraints for ordering within parent entities

### Indexes
- ✅ Indexes on foreign keys for join performance
- ✅ Composite indexes for common query patterns (session + concept, session + mastery_level)
- ✅ Index on mastery_level for "Target Weaknesses" queries

### Future Enhancements
- **User tracking**: Add `user_id` column when multi-user support is needed
- **Soft deletes**: Add `deleted_at` column if needed
- **Audit trail**: Consider adding `created_by`/`updated_by` if multi-user
- **Full-text search**: Add GIN indexes on text fields if search is needed
- **Analytics**: Consider separate table for answer history if detailed tracking is needed

---

## Migration Strategy

1. **Initial Migration**: Create all tables, types, indexes, triggers, and RLS policies
2. **Future Migrations**: 
   - Add `user_id` columns when multi-user is needed
   - Add `deleted_at` if soft deletes are implemented
   - Add any additional indexes based on query patterns

---

## Questions Summary

Please confirm:
1. ✅ Use UUIDs for primary keys? (Recommended: Yes)
2. ✅ Add `user_id` columns now or later? (Recommended: Later, via migration)
3. ✅ Use JSONB for `special_resources`? (Recommended: Yes)
4. ✅ Store MMD in TEXT columns? (Recommended: Yes for MVP)
5. ✅ Include `updated_at` timestamps? (Recommended: Yes)
6. ✅ Use soft deletes? (Recommended: Yes for user content, No for generated content)
7. ✅ Use integer `order_index`? (Recommended: Yes)

Once confirmed, I'll create the migration file and apply it to your Supabase project.

