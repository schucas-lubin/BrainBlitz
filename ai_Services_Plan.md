# BrainBlitz AI Services Plan

_File: `ai_Services_Plan.md`_  
_Status: Draft implementation spec for AI-powered features in BrainBlitz_

---

## 1. Purpose & Scope

This document defines the **AI services layer** for BrainBlitz, focusing on:

- How uploaded/processed content is turned into:
  - A **topic tree** (topics → subtopics → concepts),
  - Concept-level **notes**, **quiz questions**, and **Wordle-style game entries**.
- The **jobs** (LLM calls) needed to do this.
- The **data shapes** involved (inputs/outputs, DB interactions).
- The **APIs and behaviors** that the UI and server can rely on.
- A small set of **regeneration flows** for improving notes and questions during study.

This is not a code-level implementation document and does **not** attempt to define exact TypeScript or SQL syntax. It is an architectural and behavioral spec intended to be turned into concrete code and prompts in Cursor.

---

## 2. High-Level AI Flow

### 2.1 Overall lifecycle

1. **Upload & Extraction (already implemented)**  
   - User creates a session and uploads one or more files (PDFs/images).  
   - BrainBlitz uses **Mathpix** to extract content into **Mathpix Markdown (MMD)**.  
   - Output is stored in `sessions.raw_mmd` (possibly as a merged or concatenated MMD string for all files in the session).

2. **Stage 1 – Topic Tree & Research Flags**  
   Trigger: user clicks **"BrainBlitz this session"** (or similar) for the first stage.

   - AI reads the session’s extracted content (`raw_mmd` + metadata).  
   - It identifies **explicit** and **implicit** topics/subtopics/concepts.  
   - It builds a **hierarchical topic tree**:
     - Topic → Subtopic → Concept (3-level hierarchy), with rare orphan concepts allowed.
   - It also suggests which **concepts should be marked for research** (`needs_research = true`).  
   - The topic tree and research flags are written to the DB.

   At this point the user can:

   - Review topics, subtopics, concepts.
   - Delete / rename / add concepts/topics/subtopics via the UI.  
   - Toggle the `needs_research` flags (star/unstar concepts).

3. **Stage 2 – Content Generation (Notes, MCQs, Word Game)**  
   Trigger: user clicks **"Generate content"** or equivalent after reviewing the tree.

   - AI reads the **finalized topic tree** from the DB.
   - For each concept, it generates:
     - **Notes** (markdown) stored on the concept,
     - A set of **MCQ questions**,
     - One or more **Wordle-style entries** (word + clue).
   - For concepts with `needs_research = true`, it uses a research-capable mode (e.g., browsing-enabled model) to ensure higher-quality, up-to-date information.

4. **Ongoing refinement during study**  
   While using BrainBlitz, the user can:

   - **Rewrite notes** for a concept with modifiers like “add detail”, “make more specific”, “add examples/analogies”.  
   - Mark a **quiz question as bad**, which triggers a rewrite of that specific question without affecting mastery history.

The AI layer is responsible for jobs in **Stage 1**, **Stage 2**, and the **regeneration flows**.

---

## 3. Data Model Assumptions

> Note: These are conceptual shapes that must align with Supabase schema, but the doc avoids exact column names where possible.

### 3.1 Sessions

- `sessions` table (already exists).
- Fields (relevant for AI):
  - `id`: UUID.
  - `title`: text.
  - `subject`: text (optional; e.g., “CHEM 220 – Organic Chemistry I”).
  - `raw_mmd`: text – merged Mathpix Markdown for this session.
  - `created_at`, `updated_at`.
  - `deleted_at` for soft delete.

The AI jobs are always driven by a `session_id`.

### 3.2 Topics, Subtopics, Concepts

BrainBlitz uses a mostly three-level hierarchy:

- **Topic**: broad umbrella (e.g., “Kinematics”, “Alkene Reactions”).  
- **Subtopic**: narrower cluster under a topic (e.g., “Free Fall”, “Hydrohalogenation & Markovnikov Rule”).  
- **Concept**: atomic study units (e.g., “Equations of motion under constant acceleration”, “Hydrohalogenation of alkenes”).

Data assumptions:

- `topics`:
  - `id`: UUID.
  - `session_id`: FK → `sessions.id`.
  - `name`: text.
  - `order_index`: integer (10, 20, 30, … for reordering).

- `subtopics`:
  - `id`: UUID.
  - `topic_id`: FK → `topics.id`.
  - `name`: text.
  - `order_index`: integer.

- `concepts`:
  - `id`: UUID.
  - `session_id`: FK → `sessions.id` (required).
  - `topic_id`: FK → `topics.id` (required; always set).
  - `subtopic_id`: FK → `subtopics.id` (nullable; null for orphan concepts that attach directly to topics).
  - `name`: text.
  - `generated_notes_mmd`: text (markdown) – **AI-generated notes** (written by Job 2).
  - `user_notes_mmd`: text (markdown) – **User-edited notes** (separate from AI-generated, for user customizations).
  - `mastery_level`: enum (`"Cooked" | "Meh" | "There's Hope" | "Locked in"`).
  - `needs_research`: boolean (default `false`).
  - `order_index`: integer.

**Important rules:**

- The **normal case** is Topic → Subtopic → Concept (all three levels present).
- **Orphan concepts** are allowed but rare: concepts with `subtopic_id = NULL` attach directly to a topic. This should only be used when a concept doesn't fit cleanly under any subtopic and creating a single-concept subtopic would be unnecessary.
- `topic_id` is always required (NOT NULL). `subtopic_id` can be NULL for orphan concepts.
- Notes storage: AI-generated notes go in `generated_notes_mmd`. User edits go in `user_notes_mmd`. The UI should display/merge both appropriately.

### 3.3 Quiz Questions

Quiz questions are **concept-centric**:

- `quiz_questions`:
  - `id`: UUID.
  - `session_id`: FK → `sessions.id` (required; derived from concept when inserting).
  - `topic_id`: FK → `topics.id` (required; derived from concept when inserting).
  - `subtopic_id`: FK → `subtopics.id` (required; derived from concept when inserting, can be NULL if concept is orphan).
  - `concept_id`: FK → `concepts.id` (required; primary relationship).
  - `question_text`: text (markdown) – the question prompt.
  - `options`: JSONB array of strings.
  - `correct_option_index`: integer (0-based index into `options`).
  - `explanation`: text (markdown, optional).

For now, only **MCQs** are supported. Other question types can be added later by extending the schema (e.g. `type` field).

### 3.4 Word Game Entries

Word game entries (for the Wordle-style game) are also concept-centric:

- `word_game_entries`:
  - `id`: UUID.
  - `session_id`: FK → `sessions.id` (required; derived from concept when inserting).
  - `topic_id`: FK → `topics.id` (required; derived from concept when inserting).
  - `subtopic_id`: FK → `subtopics.id` (required; derived from concept when inserting, can be NULL if concept is orphan).
  - `concept_id`: FK → `concepts.id` (required; primary relationship).
  - `word`: text – the answer string (length >= 4).
  - `clue`: text – short textual clue.
  - `order_index`: integer (required; values 10, 20, 30, or 40; max 4 entries per concept).

These entries are derived from concept notes and/or general knowledge.

### 3.5 Mastery Rollup

While mastery is tracked per concept, the UI will often present **subtopic-level mastery**:

- Concept-level mastery is already handled by existing `mastery.ts` logic.
- Subtopic-level mastery is computed by aggregating concept mastery under that subtopic (e.g., via weighted average or discrete labels). This aggregation logic is part of the learning/quiz layer, not the AI services themselves.

---

## 4. AI Jobs Overview

The AI layer will primarily expose **two main jobs** plus a few auxiliary regeneration flows:

1. **Job 1: SESSION_TOPIC_MAP_AND_FLAGS**  
   - Input: `session_id` (and optional parameters).  
   - Output: Topic tree (topics → subtopics → concepts) + `needs_research` flags.  
   - Side effects: Writes topics, subtopics, concepts, and `needs_research` values to the DB.

2. **Job 2: SESSION_CONTENT_GENERATION**  
   - Input: `session_id` and scope options.  
   - Output: Per-concept notes, MCQs, and word-game entries.  
   - Side effects: Writes notes to `concepts.generated_notes_mmd`, inserts `quiz_questions` and `word_game_entries` (overwriting existing content in the selected scope). When inserting quiz questions and word game entries, derives `session_id`, `topic_id`, and `subtopic_id` from the concept.

3. **Auxiliary Jobs / Operations** (small scoped actions):
   - **Rewrite notes for a concept** (with modifiers like “add detail”, “more specific”, “add examples/analogies”).  
   - **Rewrite a specific quiz question** (triggered by “bad question” button).  
   - Potential future: partial regeneration for a subtopic or session with more control.

The rest of this document clarifies the behavior and data shapes for Jobs 1 and 2, and the regeneration flows.

---

## 5. Job 1 – SESSION_TOPIC_MAP_AND_FLAGS

### 5.1 Purpose

Given a session’s extracted content, generate a **structured topic tree** and suggest which **concepts should be researched** more deeply.

This job **does not** generate notes, quiz questions, or word-game entries. It sets up the structure that Stage 2 will use.

### 5.2 Input

Primary input:

- `session_id`: UUID.

Derivable inputs (fetched server-side from Supabase):

- `session.subject`: optional subject string (e.g., “CHEM 220 – Organic Chemistry I”).
- `session.title`: session title (e.g., “Midterm 1 Review Packet”).
- `session.raw_mmd`: Mathpix Markdown string (possibly merged from multiple uploaded files).

Optional parameters (for future flexibility):

- `max_topics?: number` – soft target for max number of topics (e.g., 5–12).  
- `max_subtopics_per_topic?: number` – soft target (e.g., 3–6).  
- `max_concepts_per_subtopic?: number` – soft target (e.g., 3–8).

Initial implementation can use default values hard-coded in the job.

### 5.3 Behavior Overview

Conceptually, the job should:

1. **Parse and understand the content**  
   - Read `raw_mmd` and identify structural cues:
     - Headings, subheadings, numbered lists, bullet lists.
     - “Learning objectives”, “Topics covered”, “Key concepts” sections.
     - Explicit mentions of concept names in text or in problem statements.

2. **Identify explicit topics/concepts**  
   - Extract candidate items from:
     - Section titles (e.g., “Free Fall and Projectile Motion”).
     - Lists of objectives or topics.
     - Problem statements that explicitly mention concepts (“Using kinematics equations, determine…”).

3. **Infer implicit topics/concepts**  
   - Analyze problem text and explanations where topics are **used but not named**:
     - E.g., an alkene + HBr problem implies “Hydrohalogenation” under “Alkene Reactions”.
     - A ball dropped from a height with constant acceleration implies “Free Fall” under “Kinematics”.
   - These implicit concepts can be:
     - **Broad** (e.g., “Mechanics”),
     - **Medium** (e.g., “Kinematics”),
     - **Specific** (e.g., “Free fall under gravity”, “Hydrohalogenation”).

4. **Build a flat candidate pool**  
   - Combine explicit and implicit candidates into a single list where each item includes:
     - Name,
     - Estimated granularity (broad/medium/specific),
     - Evidence snippets or references (optional, for internal reasoning).

5. **Cluster into a 3-level hierarchy**  
   - Determine **Topics** (broadest items).  
   - Under each topic, determine **Subtopics** (medium items).  
   - Under each subtopic, assign **Concepts** (specific items).  
   - Heuristics:
     - Topics should be relatively broad (e.g., “Kinetics”, “Acid-Base Chemistry”).  
     - Subtopics should cluster related concepts (e.g., “SN1 Reactions”, “Buffer Solutions”).  
     - As you go down levels, you typically get **2–3×** more items than the level above.
   - **Orphan concepts**:
     - For outlier concepts that do not fit cleanly under a subtopic, they may attach directly to a topic as an “orphan concept” (no dedicated subtopic). This should be rare.

6. **Attach to the specific session**  
   - Ensure all topics, subtopics, and concepts are generated specifically for this `session_id` with names that reflect the content.

7. **Suggest research flags (`needs_research`)**  
   - For each concept, decide whether it should be starred for deeper research:
     - **Reasons to flag**:
       - Topic is inherently complex or historically error-prone (e.g., “Orbital Penetration and Shielding”, “SN1/SN2/E1/E2 decision logic”).  
       - Document only mentions it briefly or with poor explanation.  
       - Concept is identified implicitly from context (not explicitly explained in the document).  
       - It seems central to the exam/course (high importance) but under-explained.
     - **Reasons not to flag**:
       - Concept is simple and well-covered in the document.
       - Concept is peripheral and not central to your goals.

The job returns a structured topic tree and `needs_research` flags and writes them to the DB.

### 5.4 Output JSON Shape (Conceptual)

The internal JSON the LLM returns (before being mapped to DB rows) might look like:

```jsonc
{
  "session_id": "uuid-here",
  "topics": [
    {
      "name": "Kinematics",
      "order_index": 10,
      "subtopics": [
        {
          "name": "Free Fall",
          "order_index": 10,
          "concepts": [
            {
              "name": "Equations of motion for free fall",
              "needs_research": true
            },
            {
              "name": "Time to impact from height h",
              "needs_research": false
            }
          ]
        },
        {
          "name": "Projectile Motion",
          "order_index": 20,
          "concepts": [
            {
              "name": "Range of a projectile",
              "needs_research": false
            }
          ]
        }
      ],
      "orphan_concepts": [
        {
          "name": "Kinematic vs dynamic quantities",
          "needs_research": true
        }
      ]
    }
  ]
}
```

Notes:

- `order_index` is optional in the model output but useful. The server can also assign them (10, 20, 30, …) sequentially.
- `orphan_concepts` attach directly to a topic (no subtopic). Server logic must map these to `concepts` with `topic_id` set (required) and `subtopic_id` = NULL.

### 5.5 DB Write Behavior

Typical server-side process for Job 1:

1. Fetch `session` from DB.
2. Build prompt, send to LLM, get topic tree JSON.
3. **Transactional write**:
   - Option A: Delete existing topics, subtopics, concepts for that session and recreate them from the new tree.
   - Option B: For first-time generation, simply insert; for regeneration, you may preserve IDs if necessary (more complex).

For simplicity, the initial implementation can:

- On **first generation**:
  - Insert topics/subtopics/concepts as new rows.
- On **regeneration** (if full regeneration is requested):
  - Delete all existing topics/subtopics/concepts for that session and recreate from scratch.
  - Warn the user in UI that this will also delete all associated notes, quiz questions, and word-game entries unless explicitly preserved.

For each concept row:

- `generated_notes_mmd` may be empty initially (notes added in Job 2).
- `user_notes_mmd` remains NULL (user edits happen later, if at all).
- `needs_research` is set from the model's flag.
- For orphan concepts: `subtopic_id` is set to NULL, `topic_id` is set to the parent topic's ID.

### 5.6 UI Integration – Stage 1 Stop Point

After Job 1 completes, the UI should show:

- The topic tree for the session.
- For each concept:
  - Name.
  - Whether it is starred for research (`needs_research`).
- Actions per node:
  - **Edit name** → updates DB.
  - **Delete** → deletes concept/subtopic/topic (and cascades down children).
  - **Add concept/subtopic/topic** → user-defined additions, created via forms.
  - **Toggle research** (star/unstar) → updates `needs_research` in DB.

Only after the user is satisfied with the tree and research flags do they trigger **Stage 2**.

---

## 6. Job 2 – SESSION_CONTENT_GENERATION

### 6.1 Purpose

Given a finalized topic tree and research flags, generate:

- **Concept notes** (markdown descriptions),
- **MCQ quiz questions**,
- **Word-game entries** (Wordle-style word + clue),

for a chosen scope (session / subtopic / list of concepts).

All generated content is stored in the DB and used by Learn/Quiz/Game modes.

### 6.2 Input

Primary input:

- `session_id`: UUID.

Optional scope specification (one of):

- `scope = "session"` – operate on all concepts in the session.
- `scope = "subtopic"` and `subtopic_id` – operate on all concepts in that subtopic.
- `scope = "concept"` and `concept_id` – operate on a single concept (e.g., after editing its name).

Additional options:

- `overwrite_mode` (for now): `"replace"`  
  - Replace existing notes, quiz questions, and word-game entries for the selected scope.
- Future: more fine-grained modes (notes-only, questions-only, etc.)

Derived inputs (server fetches from DB):

- `session.subject`, `session.title`.
- **Relevant concepts** for the chosen scope:
  - For each concept:
    - `id`, `name`, `session_id`, `topic_id`, `subtopic_id` (may be NULL for orphans),
    - `needs_research`,
    - Maybe any existing `generated_notes_mmd` (if doing partial regeneration).

### 6.3 Content Strategy

You chose a **model-first** approach:

- AI is allowed to use its general training knowledge to explain concepts, not just the session documents.
- The uploaded content (MMD) provides **context about what’s emphasized** in your course, but is not the sole source of truth.
- For `needs_research = true` concepts:
  - The model should use **web research/browsing** to get more detailed or precise information (especially for tricky/advanced concepts).

Notes should be:

- Focused and exam-oriented.
- Correct and consistent with standard textbook understanding.
- Ideally aligned with how the concept appears in the session’s content (terminology, notation) where possible.

### 6.4 Output JSON Shape (Conceptual)

For a batch of concepts, the model might return something like:

```jsonc
{
  "session_id": "uuid-here",
  "scope": "session",
  "concepts": [
    {
      "concept_id": "uuid-concept-1",
      "notes_markdown": "### Hydrohalogenation of Alkenes\n\nHydrohalogenation is the addition of HX (HCl, HBr, HI) to an alkene...",
      "quiz_questions": [
        {
          "question_text": "In the hydrohalogenation of an unsymmetrical alkene with HBr, the major product typically follows:",
          "options": [
            "Zaitsev's rule",
            "Markovnikov's rule",
            "Anti-Markovnikov's rule",
            "Hofmann's rule"
          ],
          "correct_option_index": 1,
          "explanation": "Hydrohalogenation follows Markovnikov's rule: the proton adds to the carbon with more hydrogens..."
        },
        {
          "question_text": "Which of the following factors most strongly affects the rate of hydrohalogenation of an alkene?",
          "options": [
            "Nucleophile concentration",
            "Carbocation stability",
            "Solvent polarity",
            "Presence of light"
          ],
          "correct_option_index": 1,
          "explanation": "The reaction proceeds through a carbocation intermediate; more stable carbocations form faster..."
        }
      ],
      "word_game_entries": [
        {
          "word": "MARKOVNIKOV",
          "clue": "Last name of the chemist whose rule predicts the regiochemistry of many hydrohalogenation reactions.",
          "order_index": 10
        }
      ]
    }
  ]
}
```

The server is responsible for:

- Validating this JSON against a local schema.
- Writing `notes_markdown` to `concepts.generated_notes_mmd` (not `user_notes_mmd`).
- Inserting `quiz_questions` rows: for each question, derive `session_id`, `topic_id`, and `subtopic_id` from the concept before inserting.
- Inserting `word_game_entries` rows: for each entry, derive `session_id`, `topic_id`, and `subtopic_id` from the concept before inserting. Ensure `order_index` values are 10, 20, 30, or 40 (max 4 entries per concept).

### 6.5 DB Write Behavior

Given a scope (session/subtopic/concept) and overwrite mode `"replace"`:

1. Determine the list of **concept IDs** in scope.
2. For **each concept**:
   - Delete existing quiz questions for that concept.
   - Delete existing word-game entries for that concept.
   - Optionally (and typically) replace the notes field for that concept.
3. Insert newly generated quiz questions (with derived `session_id`, `topic_id`, `subtopic_id`) and word-game entries (with derived `session_id`, `topic_id`, `subtopic_id`, and valid `order_index` values).
4. Update notes field (`concepts.generated_notes_mmd`) for each concept.

The **scope overwrite** is guarded by user confirmation in the UI:

- Example: “Regenerating content for Subtopic ‘Free Fall’ will replace all notes, quiz questions, and word-game entries for its concepts. Continue?”

### 6.6 UI Integration – Stage 2

After Job 2 completes, the UI should:

- Display concept notes in the Learn view.
- Display MCQs in Quiz mode for that subtopic/session.
- Provide access to the Wordle-style game using the generated words/clues.

Users can then:

- Use quizzes to drive mastery updates.
- Use the “bad question” and “rewrite notes” actions defined below.

---

## 7. Regeneration Flows & Fine-Grained Controls

### 7.1 Rewrite Notes for a Concept

**Motivation:** Sometimes the initial notes are:

- Too short,
- Too vague,
- Lacking examples or analogies.

Rather than forcing a full session-level regeneration, the user should be able to adjust a specific concept’s notes.

#### 7.1.1 UI Behavior

On the concept detail view (or hover state), show a **“Rewrite notes”** button that opens a modal with options like:

- “Add more detail/length”
- “Make more specific to this topic/session”
- “Add examples and/or analogies”

User can choose one or multiple options.

#### 7.1.2 API Behavior

Endpoint example:

- `POST /api/ai/concepts/:conceptId/rewrite-notes`

Request body:

```jsonc
{
  "concept_id": "uuid-concept-1",
  "modifiers": {
    "add_detail": true,
    "make_more_specific": false,
    "add_examples": true
  }
}
```

Server tasks:

1. Fetch concept (name, existing `generated_notes_mmd`, `needs_research`, session context).
2. Build a prompt instructing the model to **rewrite the notes** respecting the chosen modifiers.
3. Call LLM with the prompt.
4. Overwrite `concepts.generated_notes_mmd` with the new markdown (does not affect `user_notes_mmd`).

No quiz questions or word-game entries are changed by this operation.

### 7.2 “Bad Question” Flow – Rewrite a Single MCQ

**Motivation:** Some generated questions will be bad (ambiguous, trivial, unclear). During study, user should be able to flag them and get a replacement.

#### 7.2.1 UI Behavior

Each MCQ in Quiz mode should have a **“Bad question”** or small “flag” button. When clicked:

- The question is **skipped** (does not affect mastery calculations).
- A modal optionally asks for a reason (optional text).
- The system triggers a rewrite for this specific question.

#### 7.2.2 API Behavior

Endpoint example:

- `POST /api/ai/quiz-questions/:id/rewrite`

Request body:

```jsonc
{
  "quiz_question_id": "uuid-question-1",
  "reason": "The options feel too similar and confusing."
}
```

Server tasks:

1. Fetch the original question (`question_text`, `options`, `correct_option_index`, `explanation`) and associated `concept_id`, `session_id`, `topic_id`, `subtopic_id`.
2. Fetch concept (name, `generated_notes_mmd`) and subtopic/topic context if helpful.
3. Build a prompt that:
   - Explains the concept again,
   - Provides the original question + options + explanation,
   - Provides the user's reason (if any),
   - Asks the model to generate a **new MCQ** for the same concept that is better.
4. Replace the old question in DB with the new one (keeping the same `id` or creating a new row and deleting the old, depending on implementation). Ensure `session_id`, `topic_id`, and `subtopic_id` are preserved.
5. The flagged question should **not count** toward mastery for that quiz attempt (handled by the quiz logic, not the AI job).

---

## 8. Prompting Guidelines (Conceptual, Not Final Text)

### 8.1 General Rules

Across jobs:

- **Output strictly in JSON** for the main jobs (Job 1 & Job 2). No extra prose or explanations.  
- Be consistent with BrainBlitz’s terminology:
  - Session, topic, subtopic, concept, notes, quiz questions, word game entries.
- Prefer **clear, exam-focused phrasing** over fancy language.
- For notes:
  - Use short sections, bullet points, and simple headings.
  - Focus on what a student needs to solve problems quickly.
- For quizzes:
  - Avoid trivial “definition recall” only.
  - Include conceptual understanding and application questions.
- For word game entries:
  - Avoid obscure or extremely long words where possible.
  - Clues should be unambiguous and helpful but not give away the answer immediately.

### 8.2 Model-First with Document Context

The model should:

- Use the **session content** (MMD) to understand the context (which subtopics are emphasized, typical notation, etc.).
- Use its own training knowledge to:
  - Fill in gaps,
  - Provide standard definitions,
  - Bring clarity where the document is thin.
- Avoid contradicting the document when it clearly states something, unless it is obviously incorrect (rare; this might be a future enhancement with warnings).

### 8.3 Research-Aware Behavior

For concepts with `needs_research = true`:

- The model is allowed and encouraged to use **web browsing** to:
  - Get more detailed, precise, or updated information.
  - Verify tricky details (e.g., exceptions, edge cases, specialized terminology).
- The difference should show up as:
  - Slightly richer notes, more nuanced explanations,
  - Higher-quality quiz questions (less likely to be wrong/ambiguous).

Specific technical details of how to enable browsing depend on the chosen OpenAI API and will be defined later in a separate implementation doc.

---

## 9. API Surface (High-Level Proposal)

> Naming and exact URL patterns can be adjusted to fit the existing Next.js route structure. This is conceptual.

### 9.1 Topic Tree & Research Flags

- `POST /api/ai/sessions/:sessionId/topic-tree`
  - Triggers **Job 1** for the given session.
  - Optional body for job parameters (max topics, etc.).
  - Writes topics/subtopics/concepts and `needs_research` flags to DB.
  - Returns the topic tree JSON as confirmation.

### 9.2 Content Generation

- `POST /api/ai/sessions/:sessionId/content`
  - Triggers **Job 2** for the given session.
  - Body includes:
    - `scope`: `"session" | "subtopic" | "concept"`,
    - `subtopic_id` or `concept_id` if needed,
    - `overwrite_mode`: `"replace"` (for now).
  - Writes notes, quiz questions, and word-game entries to DB.
  - Returns a summary (e.g., number of concepts updated, number of questions generated).

### 9.3 Rewrite Notes

- `POST /api/ai/concepts/:conceptId/rewrite-notes`
  - See section 7.1.

### 9.4 Rewrite Quiz Question (“Bad Question”)

- `POST /api/ai/quiz-questions/:questionId/rewrite`
  - See section 7.2.

Additional internal utilities (for admin/debugging) can be added as needed, such as:

- `GET /api/ai/sessions/:sessionId/debug-topic-tree` – fetches the last raw topic tree JSON returned by the model (if stored).
- `GET /api/ai/logs/:runId` – to inspect a particular LLM run (if logs are persisted).

---

## 10. Observability, Testing, and Safety

### 10.1 Logging and Debugging

For development and early use, it is important to:

- Log raw LLM responses (particularly for Job 1 and Job 2), at least temporarily, for debugging.  
- Log validation errors when JSON does not match the expected schema.  
- Provide some way (even if just console logs initially) to see what the model generated for a given session.

Later, an admin-only UI could list:

- All sessions processed,
- Their topic trees,
- The number of notes/questions/word entries generated,
- Links to re-run jobs.

### 10.2 Testing

Each job should be testable via:

- **Unit-like tests** with fixed MMD snippets:
  - Example: A small pseudo-lecture on “Hydrohalogenation” should reliably produce expected topic/subtopic/concept structure.
- **Integration tests** on selected real documents:
  - Verify that topic trees look reasonable.
  - Verify that content-generating jobs respect overwrite behavior and DB constraints.

Prompt changes should be made cautiously and ideally tested on a few representative sessions (e.g., physics, chemistry, calculus).

### 10.3 Safety Considerations

- Ensure quizzes and notes do not generate blatantly wrong information, especially for flagged complex concepts. This is partly mitigated by:
  - Research mode (`needs_research`),
  - User’s ability to mark questions as bad,
  - User’s domain knowledge (you are a STEM student checking the output).
- Long-term, you could surface a simple “report issue” button for content, but this is out of scope for now.

---

## 11. Future Ideas & Upgrades (Not Requirements Yet)

> The items below are **explicitly future-facing** ideas. They are **not required** for the initial implementation but should be kept in mind as potential upgrades.

### 11.1 Optional Agent Layer on Top of Jobs

- Once Job 1 and Job 2 are implemented as solid, testable building blocks, an **agent** could be introduced on top to:
  - Decide when to rerun only certain parts of the pipeline.
  - Perform more sophisticated multi-step research (e.g., cross-referencing multiple sources).
  - Offer “clean up this session” commands that re-check topic tree quality and regenerate weak areas.

The agent would use existing jobs as tools rather than re-implementing logic in prompts.

### 11.2 Per-Concept Context Snippets

- In Job 1, the model could also generate a **short context snippet** per concept (e.g., a few sentences summarizing how the document presents it).  
- Job 2 could then use this snippet when generating notes/questions to better align with the course’s framing without needing to re-read all of `raw_mmd`.

### 11.3 More Question Types

- Expand beyond MCQs to include:
  - True/False,
  - Short answer (with normalized expected keywords),
  - Multi-select,
  - “Match the pairs” style questions.
- This would require extending `quiz_questions` schema with a `type` field and possibly additional data structures.

### 11.4 Smarter Regeneration Modes

- Add more advanced options, such as:
  - “Regenerate questions only, keep notes” for a subtopic/session.  
  - “Generate harder questions only” once mastery is high.  
  - A “refine topic tree” job that improves structure without fully regenerating content.

### 11.5 More Games

- Additional games that consume the same concept/notes/question data:
  - Flashcard-style review generated from notes,
  - Timed rapid-fire MCQs,
  - Cloze deletion (fill-in-the-blank) over notes,
  - Concept-matching game (concept ↔ definition/example).

These new games would likely have their own generation jobs for extra metadata but can build on the same concept-centric model.

### 11.6 Enhanced Research Modes

- For complex or critical concepts, introduce a **multi-step research pipeline**:
  - Gather multiple sources,
  - Cross-check assertions,
  - Surface citations in notes.  
- This might use more advanced research-oriented models or dedicated research platforms and is outside the scope of the current exam-focused implementation.

---

_End of `ai_Services_Plan.md`_