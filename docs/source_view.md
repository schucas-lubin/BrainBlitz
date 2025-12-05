# Source View Documentation

## Overview

The **Source** tab provides a dedicated view for displaying the full extracted Mathpix Markdown (MMD) content for a session. This content is rendered using the official [mathpix-markdown-it](https://github.com/Mathpix/mathpix-markdown-it) library, which provides full support for:

- **LaTeX equations** (inline `\( ... \)` and block `\[ ... \]` or `$$ ... $$`)
- **Advanced tables** (LaTeX tabular syntax)
- **Chemistry diagrams** (SMILES notation)
- **Figure references** and captions
- **Theorems, proofs, and lemmas**
- **All standard Markdown features**

## Architecture

### Components

#### `MmdSourceViewer` (`components/MmdSourceViewer.tsx`)

A client-side React component that:

1. Accepts `content: string | null` prop representing `session.raw_mmd`
2. Loads Mathpix styles on mount (fonts and rendering styles)
3. Renders the content using `MathpixMarkdownModel.render()`
4. Handles empty content gracefully with a helpful message

**Usage:**
```tsx
import MmdSourceViewer from '@/components/MmdSourceViewer';

<MmdSourceViewer content={session.raw_mmd} />
```

### Tab Structure

The Source tab is integrated into the existing session detail page alongside Learn, Quiz, and Games tabs:

- **Learn** - Topic tree, subtopics, concepts, and generated notes
- **Quiz** - Take quizzes to test knowledge
- **Games** - Wordle-style vocabulary games
- **Source** - Full extracted MMD content (NEW)

## Key Changes

### Learn Tab Changes

The Learn tab **no longer** displays the raw MMD content. Previously, when no topic tree existed, it would show a "Raw Content Preview" section that rendered `raw_mmd` using `react-markdown`. This has been removed to:

1. Eliminate the visual "flash" of raw content before the topic tree loads
2. Focus the Learn tab purely on the structured learning experience (topics → subtopics → concepts → notes)
3. Provide a clear separation between "source document" and "learning materials"

Now, when no topic tree exists, the Learn tab shows a simple prompt to generate the topic tree, with a tip directing users to the Source tab if they want to view their extracted content.

### What the Source Tab Provides

- A scrollable container for long documents
- Full Mathpix Markdown rendering with:
  - Properly rendered LaTeX math (via MathJax SVG)
  - Tables with LaTeX tabular support
  - Chemistry diagrams
  - All markdown formatting

## Dependencies

- `mathpix-markdown-it` - The official Mathpix Markdown renderer
  - Internally uses MathJax v3 for math rendering
  - Uses markdown-it for standard Markdown parsing

## Notes

- The `MmdSourceViewer` component is a **client component** (`'use client'`) because it requires browser DOM access for style injection
- Styles are loaded once and cached for performance
- The component gracefully handles null/empty content with a user-friendly message
