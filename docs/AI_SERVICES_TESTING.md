# AI Services Testing Guide

This guide provides instructions for testing the new AI services endpoints and what information to share for debugging.

## Prerequisites

1. **Environment Variables**: Ensure you have set `OPENAI_API_KEY` in your `.env.local` file
2. **Session with Content**: You need at least one session with `raw_mmd` content (extracted via Mathpix)

## Migration Status

✅ Migration `002_add_needs_research_and_orphan_concepts.sql` has been applied successfully.

The database now supports:
- `needs_research` boolean field on concepts
- Orphan concepts (concepts without subtopics, `subtopic_id` can be NULL)

---

## Testing Endpoints

### 1. Job 1: Generate Topic Tree

**Endpoint**: `POST /api/ai/sessions/:sessionId/topic-tree`

**Purpose**: Generates a hierarchical topic tree (topics → subtopics → concepts) from session content.

**Test Request**:
```bash
# Replace SESSION_ID with an actual session ID that has raw_mmd content
curl -X POST http://localhost:3000/api/ai/sessions/SESSION_ID/topic-tree \
  -H "Content-Type: application/json" \
  -d '{
    "max_topics": 10,
    "max_subtopics_per_topic": 5,
    "max_concepts_per_subtopic": 6
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "topic_tree": {
    "session_id": "...",
    "topics": [
      {
        "name": "Topic Name",
        "order_index": 10,
        "subtopics": [
          {
            "name": "Subtopic Name",
            "order_index": 10,
            "concepts": [
              {
                "name": "Concept Name",
                "needs_research": true
              }
            ]
          }
        ],
        "orphan_concepts": []
      }
    ]
  },
  "stats": {
    "topics": 3,
    "subtopics": 8,
    "concepts": 15
  }
}
```

**What to Check**:
- ✅ Response status is 200
- ✅ Topic tree structure is logical (topics → subtopics → concepts)
- ✅ Some concepts have `needs_research: true`
- ✅ Database now has topics, subtopics, and concepts for this session
- ✅ Orphan concepts (if any) have `subtopic_id: null` in database

**Debugging Info to Share**:
- Full request URL and body
- Full response (including error messages if any)
- Session ID used
- Whether session has `raw_mmd` content
- Any console errors from server logs

---

### 2. Job 2: Generate Content (Notes, Questions, Word Entries)

**Endpoint**: `POST /api/ai/sessions/:sessionId/content`

**Purpose**: Generates notes, quiz questions, and word game entries for concepts.

**Test Request**:
```bash
# Generate content for entire session
curl -X POST http://localhost:3000/api/ai/sessions/SESSION_ID/content \
  -H "Content-Type: application/json" \
  -d '{
    "scope": "session",
    "overwrite_mode": "replace"
  }'

# Generate content for a specific subtopic
curl -X POST http://localhost:3000/api/ai/sessions/SESSION_ID/content \
  -H "Content-Type: application/json" \
  -d '{
    "scope": "subtopic",
    "subtopic_id": "SUBTOPIC_ID",
    "overwrite_mode": "replace"
  }'

# Generate content for a single concept
curl -X POST http://localhost:3000/api/ai/sessions/SESSION_ID/content \
  -H "Content-Type: application/json" \
  -d '{
    "scope": "concept",
    "concept_id": "CONCEPT_ID",
    "overwrite_mode": "replace"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "scope": "session",
  "stats": {
    "concepts_updated": 15,
    "quiz_questions_generated": 45,
    "word_game_entries_generated": 20
  }
}
```

**What to Check**:
- ✅ Response status is 200
- ✅ Concepts now have `generated_notes_mmd` populated
- ✅ Quiz questions exist in `quiz_questions` table
- ✅ Word game entries exist in `word_game_entries` table
- ✅ Quiz questions have correct `session_id`, `topic_id`, `subtopic_id` (can be null for orphans)
- ✅ Word game entries have `order_index` values of 10, 20, 30, or 40
- ✅ Maximum 4 word game entries per concept

**Debugging Info to Share**:
- Full request URL and body
- Full response (including error messages if any)
- Session ID and scope used
- Number of concepts that should have been processed
- Any console errors from server logs
- Sample of generated content (notes/questions) if possible

---

### 3. Rewrite Notes for a Concept

**Endpoint**: `POST /api/ai/concepts/:conceptId/rewrite-notes`

**Purpose**: Rewrites notes for a specific concept with optional modifiers.

**Test Request**:
```bash
curl -X POST http://localhost:3000/api/ai/concepts/CONCEPT_ID/rewrite-notes \
  -H "Content-Type: application/json" \
  -d '{
    "modifiers": {
      "add_detail": true,
      "make_more_specific": false,
      "add_examples": true
    }
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "concept_id": "...",
  "notes_markdown": "### Updated Notes\n\n..."
}
```

**What to Check**:
- ✅ Response status is 200
- ✅ Concept's `generated_notes_mmd` is updated
- ✅ Notes reflect the requested modifiers (more detail, examples, etc.)

**Debugging Info to Share**:
- Full request URL and body
- Full response (including error messages if any)
- Concept ID used
- Original notes vs rewritten notes
- Any console errors from server logs

---

### 4. Rewrite a Quiz Question

**Endpoint**: `POST /api/ai/quiz-questions/:questionId/rewrite`

**Purpose**: Rewrites a single quiz question that was marked as "bad".

**Test Request**:
```bash
curl -X POST http://localhost:3000/api/ai/quiz-questions/QUESTION_ID/rewrite \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "The options feel too similar and confusing."
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "question_id": "...",
  "question": {
    "question_text": "Improved question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_option_index": 1,
    "explanation": "Explanation..."
  }
}
```

**What to Check**:
- ✅ Response status is 200
- ✅ Question in database is updated
- ✅ New question is clearer/better than original
- ✅ Options are distinct and plausible

**Debugging Info to Share**:
- Full request URL and body
- Full response (including error messages if any)
- Question ID used
- Original question vs rewritten question
- Any console errors from server logs

---

## Database Verification Queries

Run these in Supabase SQL Editor to verify the migration and data:

### Check Migration Applied
```sql
-- Verify needs_research column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'concepts' AND column_name = 'needs_research';

-- Verify subtopic_id is nullable
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'concepts' AND column_name = 'subtopic_id';
```

### Check Generated Data
```sql
-- View topic tree structure
SELECT 
  t.name as topic_name,
  st.name as subtopic_name,
  c.name as concept_name,
  c.needs_research,
  c.subtopic_id IS NULL as is_orphan
FROM topics t
LEFT JOIN subtopics st ON st.topic_id = t.id
LEFT JOIN concepts c ON c.topic_id = t.id AND (c.subtopic_id = st.id OR (c.subtopic_id IS NULL AND st.id IS NULL))
WHERE t.session_id = 'YOUR_SESSION_ID'
ORDER BY t.order_index, st.order_index, c.order_index;

-- Check generated notes
SELECT 
  c.name,
  LENGTH(c.generated_notes_mmd) as notes_length,
  c.needs_research
FROM concepts c
WHERE c.session_id = 'YOUR_SESSION_ID'
ORDER BY c.name;

-- Check quiz questions
SELECT 
  c.name as concept_name,
  qq.question_text,
  qq.correct_option_index,
  qq.options
FROM quiz_questions qq
JOIN concepts c ON c.id = qq.concept_id
WHERE qq.session_id = 'YOUR_SESSION_ID'
LIMIT 10;

-- Check word game entries
SELECT 
  c.name as concept_name,
  wge.word,
  wge.clue,
  wge.order_index
FROM word_game_entries wge
JOIN concepts c ON c.id = wge.concept_id
WHERE wge.session_id = 'YOUR_SESSION_ID'
ORDER BY c.name, wge.order_index;
```

---

## Common Issues & Solutions

### Issue: "Session not found"
- **Cause**: Invalid session ID or session doesn't exist
- **Solution**: Verify session ID exists in database

### Issue: "Session has no raw_mmd content"
- **Cause**: Session hasn't had content extracted via Mathpix
- **Solution**: Upload and extract content first using Mathpix endpoints

### Issue: "No concepts found for the specified scope"
- **Cause**: No concepts exist for the session/subtopic/concept
- **Solution**: Run Job 1 (topic-tree) first to generate concepts

### Issue: OpenAI API errors
- **Cause**: Missing or invalid `OPENAI_API_KEY`
- **Solution**: Verify environment variable is set correctly

### Issue: JSON parsing errors
- **Cause**: LLM returned invalid JSON
- **Solution**: Check server logs for raw LLM response, may need prompt tuning

### Issue: Database constraint violations
- **Cause**: Data doesn't match schema constraints
- **Solution**: Check server logs for specific constraint error, verify data structure

---

## What to Share for Debugging

When reporting issues, please include:

1. **Endpoint**: Which API endpoint you're testing
2. **Request**: Full curl command or request details (URL, method, body)
3. **Response**: Full response including status code and body
4. **Session ID**: The session ID you're testing with
5. **Server Logs**: Any console errors or logs from the Next.js server
6. **Database State**: Results of verification queries (if applicable)
7. **Environment**: Node version, Next.js version, any relevant environment info

---

## Next Steps After Testing

Once testing is complete:

1. ✅ Verify all endpoints work as expected
2. ✅ Check database structure matches expectations
3. ✅ Review generated content quality
4. ✅ Test edge cases (orphan concepts, empty sessions, etc.)
5. ✅ Integrate endpoints into UI components

---

## Quick Test Script

Here's a quick test sequence you can run:

```bash
# 1. Get a session ID (replace with actual ID)
SESSION_ID="your-session-id"

# 2. Generate topic tree
curl -X POST http://localhost:3000/api/ai/sessions/$SESSION_ID/topic-tree \
  -H "Content-Type: application/json" | jq

# 3. Wait a moment, then generate content
curl -X POST http://localhost:3000/api/ai/sessions/$SESSION_ID/content \
  -H "Content-Type: application/json" \
  -d '{"scope": "session", "overwrite_mode": "replace"}' | jq

# 4. Check results in database (use Supabase SQL Editor)
```

---

_Last Updated: After migration 002 application_

