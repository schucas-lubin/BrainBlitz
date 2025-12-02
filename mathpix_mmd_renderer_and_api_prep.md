# Mathpix MMD Renderer & API Prep

This file describes two focused tasks to prepare BrainBlitz for **Mathpix Markdown (MMD)**:

1. Creating a reusable **MMD renderer component** for the Learn tab.  
2. Adding **environment-variable and error handling scaffolding** for the Mathpix API route.

The goal is to get all *UI + DB + plumbing* ready **before** switching from mock extraction to real Mathpix HTTP calls.

---

## 0. Prerequisites / Assumptions

- The Supabase schema is applied and working.
- The app already has:
  - A `sessions` table with a `raw_mmd` `TEXT` column.
  - A **New Session** flow that currently uses **mock** Mathpix extraction and stores mock `raw_mmd`.
  - A sessions dashboard and session detail page using Supabase (no mock arrays).
- Mathpix credentials are in `.env.local` (though not yet used):
  - `MATHPIX_APP_ID`
  - `MATHPIX_APP_KEY`

We will **not** call the real Mathpix API yet. These steps just make rendering + configuration clean so that enabling real extraction later is a small, localized change.

---

## 1. Step 3 – MMD Renderer Component (Mathpix-Aware)

### 1.1 Goal

Create a single React component that is responsible for rendering **Mathpix Markdown (MMD)** in the browser, and integrate it into the **Learn** tab of the session detail view.

Key ideas:

- All Mathpix/MMD-specific logic is **encapsulated** in one component (`MmdRenderer`).
- The rest of the app should only need to pass a `content: string` prop.
- We aim to use **Mathpix’s own rendering stack**, specifically `mathpix-markdown-it`, or at least structure the component so it’s trivial to adopt it later.

Mathpix docs reference (for later integration work):

- `mathpix-markdown-it` GitHub:  
  <https://github.com/Mathpix/mathpix-markdown-it#using-mathpix-markdown-it-in-web-browsers>

### 1.2 Component API

Create `components/MmdRenderer.tsx` with an API like:

```ts
export interface MmdRendererProps {
  content: string;
  className?: string;
}

export function MmdRenderer({ content, className }: MmdRendererProps) {
  // implementation
}
```

Behavior:

- If `content` is empty or whitespace:
  - Render either nothing or a small message like `No content yet.`
- Otherwise:
  - Render the content using a Mathpix-aware rendering pipeline.

### 1.3 Implementation Strategy

#### Option A – Directly wire `mathpix-markdown-it` (ideal, if straightforward)

Follow the pattern described in the Mathpix docs for browser usage:

- Install `mathpix-markdown-it` (and any required peer dependencies).
- Create a small internal helper that:
  - Instantiates a Markdown-it instance with Mathpix plugins.
  - Converts the `content` string to HTML.
- In `MmdRenderer`, use `dangerouslySetInnerHTML` to inject that HTML into the DOM, making sure to:
  - Add CSS classes for styling.
  - Optionally scope the styles to a container.

**Important:**

- Keep all `mathpix-markdown-it`-specific setup inside `MmdRenderer` (or a tiny helper file) so nothing else in the app needs to know about Mathpix internals.
- If Mathpix requires a loader/bootstrap step (e.g. a script that sets global config), keep that logic in this component or its helper, not scattered across the app.

#### Option B – Temporary Fallback (if A is too heavy right now)

If wiring `mathpix-markdown-it` immediately is too much effort, implement a **clean fallback**:

- For now:
  - Render the content using a minimal markdown renderer (e.g. `react-markdown`), or even a `<pre>` block.
- Add **clear TODO comments** at the top of `MmdRenderer`:

  ```ts
  // TODO: Replace this fallback renderer with Mathpix's mathpix-markdown-it
  // so that equations, tables, and chemistry are rendered natively.
  ```

The key is the **API surface**, not the internals. As long as the rest of the app calls `<MmdRenderer content={...} />`, upgrading the internal implementation later is trivial.

### 1.4 Integrate `MmdRenderer` into the Learn Tab

In `app/sessions/[id]/page.tsx` (or wherever the session detail layout is defined):

1. Import the component:

   ```ts
   import { MmdRenderer } from "@/components/MmdRenderer";
   ```

2. In the **Learn** tab content area:

   ```tsx
   const rawMmd = session.raw_mmd ?? "";

   return (
     <div className="space-y-4">
       {rawMmd.trim().length === 0 ? (
         <p className="text-sm text-muted-foreground">
           No extracted content yet.
         </p>
       ) : (
         <MmdRenderer content={rawMmd} />
       )}
     </div>
   );
   ```

3. Ensure that:
   - TypeScript compiles.
   - There are no React server/client mismatches (if `MmdRenderer` needs to be a client component, add `"use client";` at the top).

### 1.5 Git Step

After this is working with the **mock** MMD data:

```bash
git add .
git commit -m "feat: add MmdRenderer component for displaying Mathpix Markdown in Learn tab"
```

At this point:

- The Learn tab is wired to `sessions.raw_mmd`.
- You can visually confirm that whatever is stored in `raw_mmd` appears in the UI.
- The component is ready to be upgraded to full Mathpix rendering later.

---

## 2. Step 4 – Env & Error Scaffolding for Mathpix API Route

Now we prepare the server-side API route for **proper configuration and error handling**, while keeping it **mocked** for the extraction result. This makes the later transition to real Mathpix HTTP calls a small, localized change.

### 2.1 Create `lib/env.ts`

Create a helper module `lib/env.ts`:

```ts
// lib/env.ts
export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}
```

Optional: you can add more helpers here later (e.g. typed parsers, boolean flags), but for now this single function is enough.

### 2.2 Update `app/api/mathpix/route.ts`

Edit the Mathpix API route so it:

- Uses `getRequiredEnv` to validate configuration.
- Returns a consistent JSON shape for success and errors.
- **Still returns mock extraction content** for now.

Outline:

```ts
// app/api/mathpix/route.ts
import { NextResponse } from "next/server";
import { getRequiredEnv } from "@/lib/env";

export async function POST(req: Request) {
  try {
    const appId = getRequiredEnv("MATHPIX_APP_ID");
    const appKey = getRequiredEnv("MATHPIX_APP_KEY");

    // TODO: Parse the multipart/form-data or whatever format you are using
    // to accept the uploaded file from the client.
    //
    // For now, we do NOT call the real Mathpix API yet.
    // Instead, we always return a mock MMD payload.

    const mockMmd = [
      "# Mock Session",
      "",
      "This is extracted content from Mathpix (mock).",
      "",
      "You can replace this with real MMD later."
    ].join("\n");

    return NextResponse.json({ rawMmd: mockMmd });
  } catch (error: any) {
    console.error("Mathpix route error:", error);
    return NextResponse.json(
      {
        error: "Mathpix route misconfigured or failed",
        details: error?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}
```

Notes:

- `getRequiredEnv` will throw a clear error if `MATHPIX_APP_ID` or `MATHPIX_APP_KEY` is missing.
- This allows you to detect misconfiguration **before** you wire in the real HTTP call.
- The client-facing contract remains:

  ```json
  { "rawMmd": "<string>" }
  ```

  which is exactly what the New Session flow and `lib/mathpix/client.ts` already expect.

### 2.3 Git Step

After updating the API route and env helper:

```bash
git add .
git commit -m "chore: add env helpers and improve Mathpix API route error handling"
```

---

## 3. Why This Makes Real Mathpix Integration Easy

Once the steps in this file are done, you will have:

1. **UI path validated**:
   - New Session flow stores some `raw_mmd`.
   - Learn tab uses `MmdRenderer` to display `raw_mmd` in a Mathpix-aware way.

2. **API path structured**:
   - `app/api/mathpix/route.ts`:
     - Validates env vars cleanly.
     - Emits predictable JSON and error shapes.
     - Logs errors to server console.

3. **Single toggle point for “real vs mock”**:
   - To switch to real Mathpix extraction later, you only need to:
     - Replace the `mockMmd` construction in `/api/mathpix/route.ts` with:
       - A real HTTP request to the Mathpix API, as per their docs.
       - Use `appId` and `appKey` from env.
     - Keep returning `{ rawMmd: string }` to the client.

Everything else (Supabase insert, Learn tab rendering, mastery utilities, etc.) will already be tested and in place.
