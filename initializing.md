# BrainBlitz Initialization Guide

This document explains the **initial technical setup** for BrainBlitz:

- Which tech stack to use.
- Why this stack makes sense for BrainBlitz specifically.
- What is expected for **Supabase**, **Mathpix**, and **AI APIs**.
- How the pieces are intended to interact.

The goal is to give enough context that an AI agent or developer can understand **where the project is starting from**, not just the end state.

---

## 1. High-Level Architecture

BrainBlitz is a **web application** that:

- Runs in the browser for the user interface.
- Uses a **Postgres database** (via Supabase) for persistence.
- Calls out to:
  - **Mathpix** (for PDF/image → Mathpix Markdown extraction).
  - **LLM APIs** (for topic trees, question generation, notes, etc.).

There is **one human user** for now, but the architecture should not block multi-user support later.

The app is mostly **CRUD + AI orchestration**:

- CRUD for sessions, topics, subtopics, concepts, questions, games, notes, mastery states.
- Orchestration to:
  - Take uploaded documents or text input,
  - Call Mathpix to get Mathpix Markdown (MMD),
  - Call LLMs to turn MMD + user instructions into topic trees, quizzes, game entries, and notes.

---

## 2. Recommended Tech Stack

### 2.1 Frontend + Backend Framework

**Framework:** `Next.js` (with the App Router)

**Language:** `TypeScript`

**UI Library:** `React`

**Styling:** `Tailwind CSS`

#### Why this stack

1. **Server + client in one codebase**  
   Next.js lets us keep:

   - UI components,
   - API routes,
   - Server-side operations (e.g., calling Mathpix or LLMs with secrets),

   all in one place. This is ideal for an app that is heavily API-driven but not extremely backend-heavy.

2. **Type safety and maintainability**  
   BrainBlitz will have a non-trivial data model (sessions, topics, subtopics, concepts, questions, games, notes, mastery). TypeScript gives us:

   - Safer refactors,
   - Better alignment between DB schema and UI types,
   - Easier for AI agents to generate correct code when types are explicit.

3. **Good ecosystem for Supabase + AI**  
   Next.js has strong community examples and patterns for integrating:

   - Supabase (auth, Row Level Security, Postgres),
   - LLMs (via server actions, API routes, or edge functions).

4. **React compatibility**  
   The existing Mathpix-related code (from other projects) is already in React + TypeScript. Reusing components like:

   - File upload UI,
   - Mathpix API client,
   - MMD viewer,

   is much easier when the primary stack is also React + TS.

---

### 2.2 Styling and UI

**Tailwind CSS** is recommended for:

- Fast iteration on layout and styling.
- Avoiding hand-written CSS boilerplate for every component.
- Making it easier for AI agents to apply consistent spacing, typography, and responsive behavior.

We don’t need a heavy component library yet. Simple Tailwind + a few custom components for layout is sufficient.

---

### 2.3 Database and Backend Services

**Primary backend:** `Supabase` (Postgres + auth + storage)

BrainBlitz uses Supabase for:

- **Database**: storing sessions, topics, subtopics, concepts, questions, games, notes, mastery states.
- **(Optional) Auth**: although there is only one user for now, using Supabase auth keeps the system ready for multiple users without a major rewrite.
- **(Optional) Storage**: if we ever need to store original PDFs, images, or binary assets, Supabase storage is an obvious place.

Supabase is chosen because:

- It provides a **managed Postgres** with a good developer experience.
- It fits nicely into a Next.js app via official client libraries.
- It allows Row Level Security and policies if/when multiple users are introduced.

---

## 3. External APIs and Services

BrainBlitz depends on at least two external categories of APIs:

1. **Mathpix** – for extraction of content to Mathpix Markdown (MMD).
2. **LLM provider(s)** – for topic tree generation, quiz/game generation, and notes.

### 3.1 Mathpix

Mathpix is responsible for turning **uploaded documents or images** into **Mathpix Markdown (MMD)**, which is the canonical content format for BrainBlitz.

#### What Mathpix does in this project

- Accepts PDF or image input.
- Returns **MMD** that may contain:
  - Plain text,
  - Equations (LaTeX),
  - Tables,
  - Figures,
  - Chemistry diagrams (SMILES),
  - MCQs (with question text, options, and any associated visuals kept together).

BrainBlitz then:

- Stores the **raw MMD** on the session.
- Uses MMD as the source for:
  - Deriving topics/subtopics/concepts,
  - Generating quizzes, games, and notes (via LLMs),
  - Rendering readable content back to the user (eventually via Mathpix’s MMD viewer).

#### Mathpix requirements

Environment variables (names can be adjusted, but should be consistent):

- `MATHPIX_APP_ID`
- `MATHPIX_APP_KEY`

These **must not be exposed directly to the client**. The recommended pattern is:

- Keep the keys on the server (Next.js API route or server action).
- Client-side upload component sends the file to a **server route**.
- The server route calls Mathpix, receives MMD, and saves it to the database.

This avoids putting sensitive keys in the browser.

#### Reusing existing Mathpix-related code

There is existing code from a previous project that already:

- Integrates with Mathpix,
- Handles PDF/image uploads,
- Renders MMD.

The plan is to:

- Identify reusable pieces:
  - Mathpix client (API wrapper),
  - Upload component,
  - MMD rendering component.
- Copy/adapt them into BrainBlitz as:

  - `lib/mathpix/client.ts`,
  - `components/MathpixUploader.tsx`,
  - `components/MmdViewer.tsx`,

  and refactor to fit the Next.js directory structure and convention.

This is the URL to the repo for the data extraction app: https://github.com/schucas-lubin/data-droid
---

### 3.2 LLM / AI Provider

BrainBlitz needs an LLM for:

- Generating the **topic tree** (Topic → Subtopic → Concept),
- Generating **MCQs** from MMD and topic tree,
- Generating **Wordle-style vocab entries** (word + clue) per concept,
- Generating **explanatory notes** in MMD for each concept/topic/subtopic.

This document is **provider-agnostic**, but expects:

- A single `generateContent` abstraction on the server side, which:
  - Accepts the relevant inputs (MMD, existing topic tree, user instructions),
  - Calls the configured LLM provider via API,
  - Returns structured JSON for:
    - Topics/subtopics/concepts,
    - Questions,
    - Game entries,
    - Notes.

Typical environment variable:

- `OPENAI_API_KEY` (or equivalent for another provider).

This key should also be server-only. The client should make requests to BrainBlitz’s own API routes, not directly to the LLM provider.

---

## 4. Environment Setup Expectations

The following environment variables are expected in `.env.local` (or equivalent):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=<supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<optional-service-role-key-for-server-only-operations>

# Mathpix
MATHPIX_APP_ID=<mathpix-app-id>
MATHPIX_APP_KEY=<mathpix-app-key>

# LLM Provider (example)
OPENAI_API_KEY=<llm-provider-key>
```

Notes:

- `NEXT_PUBLIC_*` variables are available to the client; non-public keys (Mathpix, LLM, service role) **must not** be exposed to the browser.
- Any logic that requires these sensitive keys should live in:
  - Next.js **server components**,
  - **API routes**, or
  - Server actions.

---

## 5. Initial Project Scaffolding (High-Level Steps)

1. **Create Next.js app**

   ```bash
   npx create-next-app@latest brainblitz      --typescript      --tailwind      --eslint      --app
   ```

2. **Install Supabase client**

   ```bash
   npm install @supabase/supabase-js
   ```

   Then create a simple `lib/supabaseClient.ts` and confirm basic connectivity.

3. **Create basic file structure**

   - `app/`:
     - `app/page.tsx` – landing or session dashboard.
     - `app/sessions/[id]/page.tsx` – session detail view (quiz/game/notes).
   - `lib/`:
     - `lib/supabaseClient.ts`
     - `lib/mathpix/client.ts`
     - `lib/ai/generateContent.ts`
   - `components/`:
     - `components/MathpixUploader.tsx`
     - `components/MmdViewer.tsx`
     - Simple layout components.

4. **Wire environment variables**  
   Set all required env vars in `.env.local` and ensure the app can:

   - Connect to Supabase,
   - Call a test LLM endpoint (simple echo),
   - Call Mathpix using a small test image or PDF (manual test route).

5. **Persist sessions**  
   Implement a minimal path that:

   - Creates a session row in Supabase.
   - Stores `raw_mmd` for an uploaded file after Mathpix extraction.
   - Displays that session on the main page.

This establishes the core foundation that future work (topic tree generation, quizzes, games, mastery tracking) can build on.

---

## 6. Summary for Agents

- **Use Next.js + TypeScript + React + Tailwind** as the primary stack.
- **Use Supabase** as the database (and optionally auth/storage).
- **Use Mathpix** for PDF/image → MMD extraction.
- **Use an LLM provider** (via server-side API wrapper) for:
  - Topic trees,
  - Questions,
  - Wordle entries,
  - Notes.
- Keep **all secrets server-side**, and route client operations through internal API endpoints or server actions.
- Reuse existing Mathpix-related code by extracting the API client, upload component, and MMD viewer into this project, adapting them to the Next.js environment.

This setup describes both **what** to use and **why**, so future agents and contributors know the constraints and intent behind the initial technical design.
