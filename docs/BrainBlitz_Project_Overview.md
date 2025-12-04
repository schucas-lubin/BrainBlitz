# BrainBlitz – Project Overview and Spec

## 0. Purpose and Scope

BrainBlitz is a **single-user** study tool that:

- Takes study content (uploaded or defined via AI chat),
- Turns it into:
  - **Quizzes** (for assessment),
  - **Games** (for practice, starting with a Wordle-style vocab game),
  - **Learning mode** (generated notes + user notes),
- Tracks performance per **concept** and exposes a **“Target weaknesses”** mode.

Initial implementation is **standalone**, but:

- It should **reuse** the existing Mathpix extractor app (code + API integration).
- It should be designed so that later it can:
  - Be embedded into StudyHub, **or**
  - Absorb StudyHub-like features into BrainBlitz.

---

## 1. Content Format and Extraction

### 1.1 Source extraction via Mathpix

Content is obtained by:

1. **Upload-based sessions**  
   - User uploads PDF/image.  
   - BrainBlitz uses the **existing extractor code** (Mathpix API + upload UI) to get content.  
   - The extractor returns **Mathpix Markdown (MMD)**.

2. **Chat-based sessions**  
   - User talks to an AI helper to define topics/concepts.  
   - No external extractor is needed; AI returns a **structured list of topics/subtopics/concepts** and (optionally) MMD-formatted notes.

### 1.2 Mathpix Markdown (MMD)

Mathpix Markdown is the **canonical content format** for BrainBlitz.

- It is a **superset of Markdown** with:
  - LaTeX-style equations,
  - Tabular LaTeX support,
  - Figure referencing,
  - Chemistry diagrams (SMILES, etc.),
  - Other STEM-specific syntax.

**Reasons for using MMD:**

- Keeps extraction, rendering, and AI consumption in a **single interoperable format**.
- Preserves:
  - Equations,
  - Tables,
  - Chemistry diagrams,
  - Figures,
  - MCQs (question + options + visuals) as cohesive units.

**Implementation notes:**

- **Phase 1:**  
  - Treat MMD as “Markdown + extra stuff”.  
  - Parse/render the basic Markdown subset; advanced MMD syntax can initially be passed through or rendered minimally.
- **Phase 2:**  
  - Integrate Mathpix’s web rendering components for full MMD support (equations, chemistry, advanced tables, figure references).

---

## 2. Session Model and Lifecycle

### 2.1 Core entity: Session

A **Session** is the primary unit of interaction. It contains:

- Metadata:
  - `id`
  - `title`
  - `created_at`
  - `subject` (optional, e.g. “Chemistry”, “Math”, “Physics” for future cross-session grouping)
- Content source:
  - Extracted MMD, or
  - AI-generated topics + MMD notes.
- Topic tree:
  - Topics, subtopics, concepts (see below).
- Generated:
  - Quiz questions,
  - Game entries (Wordle vocab),
  - Generated notes.
- Progress data:
  - Per-concept mastery levels and answer history.

All other entities (questions, games, notes, mastery data) are associated with a **Session**.

### 2.2 Content ingestion flow

**Upload-based flow:**

1. User uploads document(s) (PDF/image) via the BrainBlitz UI.
2. BrainBlitz calls the Mathpix API via reused extractor code.
3. Mathpix returns **MMD** representing:
   - Text,
   - Equations,
   - Tables,
   - Figures,
   - MCQs (prompt + options + visuals preserved).
4. BrainBlitz stores the raw MMD under that session (e.g. `session.raw_mmd`).

**Chat-based flow:**

1. User starts a session without uploads.
2. User describes what they want to study in a chat with an AI helper.
3. AI produces:
   - A **candidate topic tree** (topics → subtopics → concepts),
   - Optional initial MMD notes per concept.
4. User reviews and edits the topic tree (and optionally notes) before approval.

### 2.3 Topic tree and concept extraction

BrainBlitz uses a **fixed hierarchy**:

- Session
  - Subject (optional, for grouping)
  - Topic (broad, e.g. “Derivatives”)
    - Subtopic (e.g. “Product rule”)
      - Concept (e.g. “Using product rule on polynomials”)

From the raw MMD (upload-based) or AI outputs (chat-based):

- AI should:
  - Detect any **explicit structure**, including:
    - Headings (e.g. `#`, `##`, `###`),
    - Sections like “Topics”, “Concepts”, “Learning Objectives”, “Outcomes”, “Subject”.
  - Prefer **explicitly named objectives/topics** as:
    - Topics (if broad),
    - Subtopics,
    - Concepts.
- When explicit headings/objectives exist:
  - They are mapped as:
    - Document-level section → Topic,
    - Nested subsections → Subtopics/Concepts.
- When no explicit structure exists:
  - AI infers a reasonable topic tree from the content.

The topic tree must be created **before** question/game generation, because all questions/games are concept-tagged.

---

## 3. Modes

BrainBlitz has three main modes:

1. **Quizzes** (assessment, multiple choice),
2. **Games** (starting with a Wordle-style vocab game),
3. **Learning / Studying** (generated notes + user notes).

All modes are concept-aware and update per-concept mastery.

### 3.1 Quizzes

**Purpose:** Practical test prep and knowledge assessment.

**Question type (MVP):**

- **Multiple choice only**.
- Immediate feedback after each answer.

**Behavior:**

- On each question answer:
  - Show whether it was correct/incorrect.
  - Optionally show an explanation.
  - Update the **mastery state** for the associated concept.

**Question generation:**

- AI generates MCQs from:
  - Extracted content (MMD),
  - Topic tree,
  - Learning objectives (if present).
- Questions must be tagged with:
  - `session_id`
  - `topic_id`
  - `subtopic_id`
  - `concept_id`

**Question selection:**

- Default quiz mode:
  - Mix of concepts from the session.
- “Target weaknesses” quiz mode:
  - Bias selection toward low-mastery concepts (see Section 5).

### 3.2 Games – Wordle-style vocab game

**Purpose:** Engaging practice, mostly for vocabulary/terms, while still updating concept mastery.

**Rules (MVP):**

- Classic Wordle-style mechanics, with these changes:
  - Word length: any length **≥ 4**.
  - **6 guesses** per word.
  - Feedback:
    - Letter in correct position,
    - Letter present but wrong position,
    - Letter not present.
- Each puzzle includes:
  - A **textual clue/definition** displayed with the board.
  - Example:  
    - Word: `acidity`  
    - Clue: `The amount of hydronium ions in solution tells you the: ___`

**Concept association:**

- Each game entry belongs to **exactly one concept**.
- Each **concept can have up to 4 words** (i.e., 4 (clue, word) pairs) in the game.
- There are **no alt answers** per clue:
  - Each clue → exactly one correct word.
  - Disambiguation relies on:
    - The clue,
    - Letter feedback over guesses.

**Per-concept tracking:**

- Each completed word game (success or failure) updates the mastery data for that concept, similar to quiz questions.

**Target weaknesses in games:**

- “Target weaknesses” game mode:
  - Prefer concepts with lower mastery levels when choosing which word to present.

### 3.3 Learning / Studying Mode

**Purpose:** Teach, not just test.

**Structure:**

- For each **Topic / Subtopic / Concept** in a session:
  - There can be:
    - **Generated notes** (AI-generated, stored as MMD),
    - **User notes** (user-written, stored as MMD),
    - **Special resources** (MMD fragments or resource references; see below).

**UI idea: nested expandable list:**

- A tree-like interface:

  - Topic  
    - Subtopic  
      - Concept  
        - [Generated notes]  
        - [User notes]  
        - [Special resources]

- The user can:
  - Expand/collapse topics, subtopics, concepts.
  - Add/edit user notes at **Topic** and **Subtopic** levels (and optionally concept level).
  - View generated notes and user notes **visually distinct**:
    - e.g. different styles or sections for each.

**Interaction with quizzes/games:**

- When the user answers a question/game **incorrectly**:
  - They get the option to open the notes for that concept.
  - Notes are not auto-shown; they are **available after a wrong answer**.
  - This includes:
    - Generated notes,
    - User notes,
    - Special resources.

---

## 4. Notes and Special Resources

### 4.1 Notes

Each Topic/Subtopic/Concept can have:

- `generated_notes_mmd`:
  - AI-written explanation/summary.
  - Stored as MMD to allow equations, diagrams, etc.
- `user_notes_mmd`:
  - User’s handwritten or typed notes.
  - Also stored as MMD so the user can embed simple formatting or equations.

**Scope:**

- Notes are **session-scoped**:
  - They belong to a specific session’s topic tree.
  - They are used when answering questions in that session.

### 4.2 Special resources

**Special resources** are optional attachments that leverage MMD’s capabilities:

- Example types:
  - Extracted figures,
  - Extracted tables,
  - Extracted chemistry diagrams (SMILES, etc.),
  - Question-specific visuals (diagrams, graphs) pulled out of the original MMD.

**Usage:**

- Special resources should be:
  - Linked to `Topic`, `Subtopic`, or `Concept`.
  - Presented alongside notes when the user opens that node.
- They should be usable by:
  - Quizzes (e.g., show a figure with the question),
  - Learning mode (e.g., show a molecular structure next to the explanation),
  - Games (if applicable later).

**Implementation idea:**

- Per Topic/Subtopic/Concept:
  - `special_resources` field (JSON) describing:
    - Type (e.g. `figure`, `table`, `chemical_diagram`),
    - Reference/ID into the MMD or storage,
    - Optional caption.
- Initially, special resources can be:
  - Simple references to specific MMD blocks inside `session.raw_mmd`.

---

## 5. Mastery Tracking and “Target Weaknesses”

### 5.1 Mastery levels

Each **Concept** has a mastery level:

1. **Cooked** (lowest)
2. **Meh**
3. **There’s Hope**
4. **Locked in** (highest)

Mastery is updated based on the history of correct/incorrect answers for that concept.

### 5.2 Transition logic (v1 rules)

Per concept, track:

- `mastery_level` ∈ {Cooked, Meh, There’s Hope, Locked in},
- `streak_correct` (int),
- `streak_incorrect` (int).

**Initial state:**

- `mastery_level = Cooked`
- `streak_correct = 0`
- `streak_incorrect = 0`

**On each answer (quiz or game) for a concept:**

1. **If answer is correct:**
   - `streak_correct += 1`
   - `streak_incorrect = 0`
   - Transition rules:
     - If current level = **Cooked** and `streak_correct >= 3`:
       - `mastery_level = Meh`
       - `streak_correct = 0`
     - If current level = **Meh** and `streak_correct >= 2`:
       - `mastery_level = There’s Hope`
       - `streak_correct = 0`
     - If current level = **There’s Hope** and `streak_correct >= 2`:
       - `mastery_level = Locked in`
       - `streak_correct = 0`
     - If current level = **Locked in`**:
       - You can either:
         - Keep it as `Locked in` regardless (no further level),
         - Or track streak for analytics only (no level change).

2. **If answer is incorrect:**
   - `streak_incorrect += 1`
   - `streak_correct = 0`
   - Transition rules:
     - If current level = **Meh** and `streak_incorrect >= 2`:
       - `mastery_level = Cooked`
       - `streak_incorrect = 0`
     - If current level = **There’s Hope** and `streak_incorrect >= 2`:
       - `mastery_level = Meh`
       - `streak_incorrect = 0`
     - If current level = **Locked in** and `streak_incorrect >= 2`:
       - `mastery_level = There’s Hope`
       - `streak_incorrect = 0`
     - If current level = **Cooked**:
       - Remain in Cooked (but streaks still tracked).

This matches your example behavior:

- Start in Cooked:
  - 3 correct → Meh.
- From Meh:
  - 1 wrong → still Meh (streak_incorrect = 1),
  - 2nd wrong in a row → Cooked,
  - or 2 consecutive correct → There’s Hope.

### 5.3 Target weaknesses

When starting a new quiz or game:

- User can select:
  - Normal mode:
    - Concepts sampled across the mastery range.
  - **Target weaknesses mode**:
    - Priority given to concepts with lower mastery levels:
      - Start with **Cooked**,
      - Then **Meh**,
      - Then others if needed.

Implementation detail:

- Simple heuristic is enough:
  - For example, choose concepts with probability weighted by:
    - Cooked concepts weight = 3,
    - Meh concepts weight = 2,
    - There’s Hope weight = 1,
    - Locked in weight = 0 (or very small).

---

## 6. Data Model (MVP-level detail)

This is not strict SQL, but outlines the minimum shapes.

### 6.1 Session

- `id`
- `title`
- `subject` (optional string: “Chemistry”, “Math”, etc.)
- `raw_mmd` (text; original extracted or AI-generated MMD)
- `created_at`

### 6.2 Topic / Subtopic / Concept

**Topic:**

- `id`
- `session_id`
- `name`
- `order_index` (for display ordering)
- `generated_notes_mmd` (optional)
- `user_notes_mmd` (optional)
- `special_resources` (JSON, optional)

**Subtopic:**

- `id`
- `session_id`
- `topic_id`
- `name`
- `order_index`
- `generated_notes_mmd` (optional)
- `user_notes_mmd` (optional)
- `special_resources` (JSON, optional)

**Concept:**

- `id`
- `session_id`
- `topic_id`
- `subtopic_id`
- `name`
- `order_index`
- `generated_notes_mmd` (optional)
- `user_notes_mmd` (optional)
- `special_resources` (JSON, optional)
- **Mastery fields:**
  - `mastery_level` (enum: Cooked / Meh / There’s Hope / Locked in)
  - `streak_correct` (int)
  - `streak_incorrect` (int)

### 6.3 QuizQuestion

- `id`
- `session_id`
- `topic_id`
- `subtopic_id`
- `concept_id`
- `question_text` (string; can be rendered from MMD or plain text)
- `options` (JSON array of strings; MCQ options)
- `correct_option_index` (int)
- `explanation` (string, optional; can be MMD or plain text)
- Optional reference into `special_resources` or `raw_mmd` if visuals are needed.

### 6.4 WordGameEntry (Wordle-style)

- `id`
- `session_id`
- `topic_id`
- `subtopic_id`
- `concept_id`
- `word` (string; answer word, length ≥ 4)
- `clue` (string; definition/prompt)
- `order_index` (optional; for deterministic ordering per concept)

Each concept can have **up to 4** WordGameEntry rows.

---

## 7. MVP Requirements (Implementation Checklist)

For the **first working version**, BrainBlitz must:

1. **Sessions and topic tree**
   - Create sessions via:
     - Upload + Mathpix extraction (MMD),
     - Chat-based topic definition.
   - Build and store:
     - Topic → Subtopic → Concept hierarchy for each session.

2. **Quizzes**
   - Generate and store MCQs for concepts.
   - Display MCQs with:
     - Question text,
     - Options,
     - Immediate correctness feedback.
   - Update per-concept mastery using the rules in Section 5.

3. **Wordle-style game**
   - Create WordGameEntry rows per concept (up to 4).
   - Implement game UI:
     - Variable-length words (≥ 4),
     - 6 guesses,
     - Classic Wordle feedback,
     - Always show clue text.
   - Update per-concept mastery from game results.

4. **Learning / Notes UI**
   - Implement nested expandable tree for:
     - Topics,
     - Subtopics,
     - Concepts.
   - Show:
     - Generated notes (MMD),
     - User notes (MMD),
     - Special resources (if any),
     - With generated vs user notes visually distinct.
   - Allow user to add/edit notes.

5. **Wrong-answer flow**
   - After a wrong answer (quiz or game):
     - Offer a way to open the notes/resources for that concept.
     - Show both generated and user notes and any special resources.

6. **Target weaknesses**
   - “Target weaknesses” mode must:
     - Prefer low-mastery concepts when selecting next questions/words.

7. **Storage**
   - Use **Supabase** as the backend to store:
     - Sessions,
     - Topic tree,
     - Questions,
     - WordGame entries,
     - Notes,
     - Mastery data.
